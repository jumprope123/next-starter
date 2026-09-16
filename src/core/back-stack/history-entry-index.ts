/**
 * history entry 위치 인덱스 스탬프 — back-stack 전용 최소 구현.
 *
 * `history.pushState / replaceState` 를 감싸 매 entry 에 단조 증가 인덱스를 박고, popstate 에서
 * 그 인덱스를 비교해 진행 방향(back / forward)을 판정한다. 옵저버나 타이머를 돌리지 않고
 * state 객체에 숫자 하나를 추가할 뿐이라 상주 비용이 없다.
 *
 * back-stack 이 이 값을 쓰는 곳:
 *  1. `isStillOnSentinelEntry` — sentinel 마커가 replaceState(nuqs 등)로 지워져도 위치 인덱스로
 *     "아직 같은 entry 위" 인지 되짚는다.
 *  2. `skipSentinelEntry` — stale/sandwich sentinel 을 흡수할 때 back 으로 되돌릴지 forward 로
 *     지나칠지 방향을 고른다.
 *
 * 모듈 로드 시점(= 어떤 useEffect 보다 먼저)에 패치하므로, 이후 Next 의 app-router 가 useEffect
 * 에서 pushState/replaceState 를 다시 패치해도 Next 의 래퍼가 우리 래퍼를 감싼다
 * (Next → ours → native). Next 가 state 를 정제하더라도 그 다음 단계인 우리 래퍼가 인덱스를
 * 다시 박으므로 스탬프는 항상 살아남는다.
 */

export const HISTORY_IDX_KEY = '__appHistoryIdx';

/** 지금까지 발생한 pushState 횟수 = 가장 깊은 위치 인덱스. */
let navCounter = 0;
/** 현재 history 위치의 인덱스. */
let currentIdx = 0;
/** 직전 popstate 의 진행 방향. 신호가 없으면 'back' — 기존 sentinel 흡수 동작을 보존한다. */
let lastPopstateDirection: 'back' | 'forward' = 'back';

const readIdx = (state: unknown): number | null => {
  if (!state || typeof state !== 'object') return null;
  const idx = (state as Record<string, unknown>)[HISTORY_IDX_KEY];
  return typeof idx === 'number' ? idx : null;
};

/** 현재 history entry 에 스탬프된 위치 인덱스. 미스탬프/SSR 이면 null. */
export function getHistoryEntryIndex(): number | null {
  if (typeof window === 'undefined') return null;
  return readIdx(window.history.state);
}

/** 직전 popstate 가 back 이었는지 forward 였는지. */
export function getLastPopstateDirection(): 'back' | 'forward' {
  return lastPopstateDirection;
}

function installHistoryIndexPatch(): void {
  type PatchedHistory = History & { __appIdxPatched?: boolean };
  const history = window.history as PatchedHistory;
  if (history.__appIdxPatched) return;
  history.__appIdxPatched = true;

  // 새로고침 등으로 이미 스탬프된 entry 에 복귀한 경우 그 인덱스를 이어받는다.
  const initialIdx = readIdx(window.history.state) ?? 0;
  navCounter = initialIdx;
  currentIdx = initialIdx;

  const originalPush = window.history.pushState.bind(window.history);
  const originalReplace = window.history.replaceState.bind(window.history);

  window.history.pushState = function patchedPushState(data, unused, url) {
    navCounter += 1;
    currentIdx = navCounter;
    return originalPush({ ...data, [HISTORY_IDX_KEY]: currentIdx }, unused, url);
  };
  // replace 는 같은 위치를 덮어쓰므로 인덱스를 올리지 않고 currentIdx 를 유지한다.
  window.history.replaceState = function patchedReplaceState(data, unused, url) {
    return originalReplace({ ...data, [HISTORY_IDX_KEY]: currentIdx }, unused, url);
  };

  // 모듈 로드 시점 등록이라 back-stack 의 useEffect 리스너보다 먼저 실행된다 → back-stack 이
  // `getLastPopstateDirection()` 을 읽을 때 이미 이번 popstate 의 방향이 반영되어 있다.
  window.addEventListener('popstate', (event: PopStateEvent) => {
    const destIdx = readIdx(event.state);
    if (destIdx === null || destIdx === currentIdx) return;
    lastPopstateDirection = destIdx > currentIdx ? 'forward' : 'back';
    currentIdx = destIdx;
  });
}

if (typeof window !== 'undefined') installHistoryIndexPatch();
