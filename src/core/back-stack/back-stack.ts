'use client';

/**
 * 안드로이드 하드웨어 back / 브라우저 back 으로부터 모달·바텀시트를 보호하는 전역 stack.
 *
 * 작동 원리
 * - 모달이 열릴 때 history.pushState 로 sentinel entry 한 칸을 쌓고, stack 에 onClose 핸들러를 push.
 * - OS / 브라우저 back → sentinel pop → popstate 발생 → handlePopstate → stack top 의 onClose 호출.
 * - X / 오버레이 클릭 · props.open=false 토글 · 네이티브 back 브릿지(consumeBack — 네이티브가
 *   handled=true 를 받아 history.back() 을 생략한다) 등 popstate 를 거치지 않는 경로로 닫히면
 *   sentinel entry 는 history 에 그대로 남는다. 이 "stale sentinel" 의 개수를 모듈이
 *   `staleSentinelCount` 카운터로 누적해 두었다가, 사용자가 다음에 back 을 누를 때 handlePopstate 가
 *   카운트만큼 history.back() 으로 한 칸씩 자동 흡수한다 → 시트 여러 개를 연속으로 X 로 닫아도
 *   사용자는 back 한 번으로 실제 이전 화면에 도달한다 (모든 흡수는 동일 popstate chain 안에서 일어남).
 *
 *   cleanup 에서 곧장 history.back() 을 부르지 않는 이유:
 *   같은 click 안에서 setOpen(false) 와 router.push/replace 가 같이 호출되면 cleanup 은 urgent
 *   commit 직후 sync 로 실행되는데, 이 시점엔 아직 router 의 history 반영 전이다. 여기서
 *   history.back() 을 부르면 router 가 entry 를 덮기 전에 pop 되어 popstate → Next 의
 *   ACTION_TRAVERSE 가 navigation 을 덮어쓰는 race 가 난다. 그래서 cleanup 은 history 를 건드리지
 *   않고 카운터만 +1 하며, 실제 정리는 다음 popstate(back) 시점으로 미룬다. router 가 push 로 새
 *   entry 를 쌓았다면 sentinel entry 는 그 아래 묻혀 흡수 대상이 아니고(인덱스가 늘어 구분된다),
 *   라우트 변경 시 clearBackStackOnRouteChange 가 카운터를 0 으로 리셋한다.
 *
 *   반면 **같은 entry 를 덮는 replaceState 는 흡수 대상이다** — entry 가 사라지지 않기 때문이다.
 *   sentinel 마커는 지워지므로 위치 인덱스로 판정한다 (`isStillOnSentinelEntry`).
 *
 * Native WebView 협업 (선택)
 * - 네이티브 셸(WebView) 안에서 돌릴 경우, 네이티브가 hardware back 시 웹에 물어보는 브릿지를
 *   만들고 `consumeBack()` 결과(handled 여부)를 응답하면 된다.
 *   handled=true → web 이 모달을 닫았으므로 native 는 라우트 pop 을 수행하지 않는다.
 *   handled=false → web 에 닫을 모달이 없으니 native 가 history.back()/종료를 처리한다.
 * - 브릿지 미적용 native 라면 자동으로 history.back() 만 발생시키므로 popstate 경로가 fallback 으로 동작.
 */

import { registerBackStackBridge } from '@/i18n/back-stack-bridge';

import { getHistoryEntryIndex, getLastPopstateDirection } from './history-entry-index';

const SENTINEL_KEY = '__appBack';

export type BackHandler = {
  readonly id: number;
  readonly onClose: () => void;
};

let stack: BackHandler[] = [];
let nextId = 1;
let suppressNextPop = 0;

/**
 * X·오버레이 등 back 외 경로로 닫혀 history 에 남아 있는 stale sentinel entry 수.
 * cleanup 마다 +1, handlePopstate 의 stale 분기가 한 번에 하나씩 history.back() 으로 흡수해 -1.
 *
 * boolean 이 아닌 카운터인 이유: 단일 페이지 안에서 시트 여러 개를 연속으로 X 로 닫으면
 * stale entry 가 누적된다. boolean 으로는 한 칸만 기억해 사용자가 뒤로가기 한 번에 entry 두 칸을
 * 모두 흡수하지 못하고 한 칸은 여전히 남아 화면 변화 없는 popstate 가 발생, 뒤로가기를 한 번 더
 * 눌러야 진짜 이전 페이지로 가는 문제가 있었다.
 */
let staleSentinelCount = 0;

/**
 * 직전 popstate 가 sentinel 흡수(skipSentinelEntry)로 우리가 발생시킨 것인지 표시.
 *
 * 흡수용 history.back() 의 popstate 는 사용자 back 이 아니므로 stack 핸들러를 소비하면
 * 안 된다. 특히 sentinel entry 의 URL 이 도착 라우트와 같아 흡수 도중 그 라우트의 컴포넌트가
 * 리마운트되며 핸들러를 새로 등록하는 경우, 뒤이어 도착하는 흡수 popstate 가 그 핸들러를
 * pop 해 버린다. 흡수 popstate 는 stack 소비를 건너뛰고 stale/sandwich 흡수 체인만 계속 잇는다.
 */
let absorptionInFlight = false;

/**
 * sentinel 한 칸을 진행 방향으로 건너뛴다. back 이면 `history.back()`, forward 면
 * `history.forward()`. 이렇게 해야 forward 네비게이션이 묻힌 sentinel 에서 되돌려지지 않는다.
 */
function skipSentinelEntry(): void {
  if (!isClient()) return;
  try {
    absorptionInFlight = true;
    if (getLastPopstateDirection() === 'forward') window.history.forward();
    else window.history.back();
  } catch {
    /* 더 이상 그 방향으로 갈 entry 가 없으면 흡수 종료 */
    absorptionInFlight = false;
  }
}

const isClient = (): boolean => typeof window !== 'undefined';

const isSentinelState = (state: unknown, id?: number): boolean => {
  if (!state || typeof state !== 'object') return false;
  const value = (state as Record<string, unknown>)[SENTINEL_KEY];
  if (typeof value !== 'number') return false;
  return id == null || value === id;
};

/**
 * cleanup 시점에 아직 그 sentinel entry 위에 서 있는가.
 *
 * 1차 판정은 state 의 sentinel 마커다. 다만 마커는 **같은 entry 를 덮는 replaceState 로 지워질
 * 수 있다** — nuqs 의 next/app adapter 는 `history.replaceState(null, '', url)` 로 state 를 통째로
 * 날리고, 우리 인덱스 패치가 `{ ...null }` 위에 인덱스만 다시 박는다. replace 는 URL 을 덮을 뿐
 * entry 를 없애지 않으므로, 마커가 사라져도 sentinel entry 는 history 에 그대로 남아 흡수 대상이다
 * (바텀시트에서 URL 쿼리를 바꾸고 닫는 필터 시트가 정확히 이 경우다).
 *
 * 그래서 마커가 없으면 위치 인덱스로 되짚는다. push 는 인덱스를 올리고 popstate 는 내리므로,
 * 인덱스가 그대로라면 "같은 entry 를 replace 로 덮었을 뿐" 이라는 뜻이다.
 *
 * `entryIdx` 가 null (인덱스 패치 미설치 · sentinel push 실패) 이면 마커 판정만 신뢰한다.
 */
const isStillOnSentinelEntry = (id: number, entryIdx: number | null): boolean => {
  if (!isClient()) return false;
  if (isSentinelState(window.history.state, id)) return true;
  if (entryIdx === null) return false;
  return getHistoryEntryIndex() === entryIdx;
};

/**
 * stack 에 닫기 핸들러를 push 하고 history sentinel 한 칸을 추가한다.
 * 반환된 unregister 는 외부 트리거(props.open=false / X 버튼 / 오버레이) 로 인한 cleanup 경로에서 호출된다.
 *
 * cleanup 은 history 를 건드리지 않고 `staleSentinelCount` 만 +1 한다. 곧장 history.back() 을
 * 부르면 다음 race 가 나기 때문이다:
 *  1) BottomSheet 안 onClick 에서 setOpen(false) + router.replace/push 를 같이 호출한다.
 *  2) React 19 가 setOpen(false) urgent update 를 먼저 commit, router.replace 는 transition 이라 뒤에 commit.
 *  3) urgent commit 직후 useLayoutEffect cleanup 이 sync 로 실행 — 이 시점 history.state 는 아직 sentinel.
 *  4) cleanup 이 history.back() 을 호출하면, router 가 history.replaceState 로 새 URL 을 쓰기 전에 entry 가 pop 된다.
 *  5) 곧이어 router transition 이 commit 되어 새 URL 로 replaceState 를 부르지만, (4) 의 popstate 가
 *     Next 의 onPopState 까지 도달해 ACTION_TRAVERSE 로 직전 URL 로 traverse → 결과적으로 URL 이 안 바뀐다.
 *
 * 그래서 stale sentinel 의 실제 정리(history.back())는 사용자가 다음에 back 을 누르는 popstate
 * 시점으로 미룬다 (handlePopstate). 같은 click 에 router 가 push 로 새 entry 를 쌓았다면 sentinel
 * entry 는 흡수 대상이 아니며, 라우트 변경 시 clearBackStackOnRouteChange 가 카운터를 0 으로
 * 리셋한다. 흡수 대상 판정은 `isStillOnSentinelEntry` 참조.
 */
export function pushBackHandler(onClose: () => void): () => void {
  if (!isClient()) return () => {};
  const id = nextId++;
  stack.push({ id, onClose });
  // 새 sentinel push 는 카운터를 건드리지 않는다 — 이전에 X 로 닫힌 시트들의 stale entry 는
  // history 깊이에 그대로 남아 있고 새 sentinel 은 그 위에 한 칸 더 쌓일 뿐. 사용자가 결국
  // 뒤로 가면 카운트만큼 한 칸씩 흡수해 누적된 stale 을 모두 정리한다.
  let pushed = false;
  try {
    window.history.pushState({ [SENTINEL_KEY]: id }, '');
    pushed = true;
  } catch {
    // 일부 샌드박스 환경에서 pushState 가 막혀도 in-memory stack 자체는 동작시킨다.
  }
  // sentinel entry 의 위치 인덱스. 마커가 replaceState 로 지워져도 이 인덱스로 되짚는다.
  // push 자체가 막혔다면 흡수할 entry 도 없으므로 null 로 둬 마커 판정만 쓰게 한다.
  const entryIdx = pushed ? getHistoryEntryIndex() : null;

  return () => {
    const idx = stack.findIndex((h) => h.id === id);
    if (idx !== -1) stack.splice(idx, 1);

    // sentinel push 가 실패했다면 흡수할 entry 도 없다.
    if (!pushed) return;

    // 아직 이 sentinel entry 위에 서 있는지로 판단한다 — stack 에서 이미 pop 되었는지가 아니라.
    //  - 브라우저/안드 back 의 popstate 로 닫힌 경우: entry 를 이미 벗어나 인덱스가 줄었다.
    //  - 네이티브 back 브릿지(consumeBack)로 닫힌 경우: stack 에선 pop 되었지만 네이티브가
    //    handled=true 를 받고 history.back() 을 하지 않으므로 entry 는 그대로 남는다.
    //  - X·오버레이·props.open=false: stack 에 남아 있었고 entry 도 그대로다.
    //  - 시트 안에서 URL 쿼리만 바꾸고 닫은 경우(nuqs 등 replaceState): 마커는 지워졌지만
    //    entry 는 남아 있다 → 인덱스가 같으므로 흡수 대상으로 잡는다.
    //  - router 가 push 로 새 entry 를 쌓았으면 인덱스가 늘어 흡수 대상이 아니다.
    if (!isStillOnSentinelEntry(id, entryIdx)) return;

    // back 키로 pop 되지 않은 경로로 닫혔다. sentinel entry 는 history 에 그대로 남아 흡수 대기가
    // 된다. 카운터를 +1 해 다음 back 들에서 한 칸씩 history.back() 으로 흡수한다 (history 는
    // 건드리지 않아 router 와의 race 를 원천 차단).
    staleSentinelCount += 1;
  };
}

/**
 * stack 이 비어 있을 때 네이티브 back(consumeBack)을 마지막으로 처리할 폴백.
 * 홈에서의 back → 앱 백그라운드 전환 같은 "닫을 것이 없을 때의 정책"을 담는다.
 *
 * stack 등록(pushBackHandler)과 달리 history sentinel 을 쌓지 않고, pop 되지도 않으며,
 * popstate 경로(handlePopstate)에서는 절대 호출되지 않는다 — 프로그램적 back / sentinel
 * 흡수 popstate 가 폴백을 오발사할 수 없다. 오직 네이티브 back 브릿지가 물어본 순간에만 평가된다.
 */
let backFallback: (() => boolean) | null = null;

/** back 폴백 등록. null 로 해제. 반환값 true = 처리함(네이티브는 history.back() 생략). */
export function setBackFallback(fallback: (() => boolean) | null): void {
  backFallback = fallback;
}

/**
 * stack 의 top 핸들러를 호출하고 pop 한다. stack 이 비어 있으면 backFallback 에 위임한다.
 * 네이티브 back 브릿지가 하드웨어 back 수신 시 호출한다.
 *
 * history 는 건드리지 않는다 — 네이티브가 handled=true 를 받고 `history.back()` 을 생략하므로
 * sentinel entry 는 그대로 남는다. 그 정리는 `pushBackHandler` 의 cleanup 이 `staleSentinelCount`
 * 를 올려 다음 back 에서 흡수하는 경로가 담당한다.
 * @returns 처리되었으면 true, stack 이 비어 있고 폴백도 없으면 false.
 */
export function consumeBack(): boolean {
  const top = stack.pop();
  if (!top) return backFallback?.() ?? false;
  top.onClose();
  return true;
}

/**
 * 라우트(pathname) 가 실제로 변경된 시점에 호출한다.
 * 상위 store 가 자체 dismiss 를 수행하므로 onClose 는 호출하지 않고
 * stack 과 suppress 카운터만 초기화한다.
 */
export function clearBackStackOnRouteChange(): void {
  stack = [];
  suppressNextPop = 0;
  // 라우트가 바뀌면 직전 화면에 있던 stale sentinel 은 더 이상 우리 책임이 아니다 (router 가
  // 자체 history 를 관리). 카운터를 0 으로 지워 다음 back 이 잘못 흡수되지 않게 한다.
  staleSentinelCount = 0;
}

/**
 * popstate 리스너 진입점.
 * 1) suppressed pop (우리가 호출한 history.back) 은 흡수.
 * 2) stack 에 핸들러 있으면 top 호출 (열린 모달을 back 으로 닫음).
 * 3) stack 비었고 stale sentinel 카운트가 남아 있으면 → 그 한 칸을 history.back() 으로 흡수.
 *    카운터가 0 이 될 때까지 매 popstate 마다 한 칸씩 처리하므로 누적된 stale entry 도 사용자의
 *    back 한 번에 모두 정리된다 (각 자동 back 이 다시 popstate 를 발생시켜 이 분기를 재진입).
 * 4) stack 비었는데 새로 도착한 위치의 state 가 우리 sentinel 이면 → 라우트 push 후 잔존 sandwich.
 *    사용자가 1 번 back 으로 진짜 prev 에 도달하도록 자동으로 한 칸 더 흡수한다.
 */
export function handlePopstate(event: PopStateEvent): boolean {
  if (suppressNextPop > 0) {
    suppressNextPop -= 1;
    return false;
  }
  // 흡수용 history.back()/forward() 가 만든 popstate — 사용자 back 이 아니므로 stack 을
  // 소비하지 않는다 (도착 라우트에서 갓 등록된 핸들러 오발사 방지, absorptionInFlight 주석 참조).
  // stale/sandwich 분기는 그대로 타서 흡수 체인은 계속 이어진다.
  const fromAbsorption = absorptionInFlight;
  absorptionInFlight = false;
  if (!fromAbsorption) {
    const top = stack.pop();
    if (top) {
      top.onClose();
      return true;
    }
  }
  if (staleSentinelCount > 0) {
    // history 에 남아 있던 stale sentinel 한 칸을 진행 방향으로 흡수. 카운트가 더 있으면 이
    // 흡수로 발생하는 다음 popstate 에서 이 분기로 재진입해 추가 흡수한다.
    staleSentinelCount -= 1;
    skipSentinelEntry();
    return false;
  }
  if (isClient() && isSentinelState(event.state)) {
    // 라우트 push 후 홈↔탭 사이 등에 끼인(sandwich) sentinel 에 도착했다. 진행 방향으로 한 칸 더
    // 건너뛴다 — back 이면 진짜 이전 페이지로, forward 면 도착 라우트로 (history.back 으로
    // 되돌리면 forward 가 홈으로 튕긴다).
    skipSentinelEntry();
    return false;
  }
  return false;
}

export function getBackStackSize(): number {
  return stack.length;
}

/**
 * 현재 history 엔트리가 (X·오버레이로 닫혀 history 에 남은) back-stack sentinel 인지 여부.
 * 시트/모달을 back 이 아닌 경로로 닫으면 sentinel 엔트리가 그대로 남는데, 그 위에서 forward
 * 네비게이션(push)을 하면 그 sentinel 이 중복 엔트리로 히스토리에 묻혀 뒤로가기 횟수가 늘어난다.
 * 다음 화면으로 이동하기 직전 이 값이 true 면 push 대신 replace 로 sentinel 을 덮어써 정리할 수 있다.
 *
 * @example
 * const navigateToNext = isCurrentEntrySentinel() ? router.replace : router.push;
 */
export function isCurrentEntrySentinel(): boolean {
  if (!isClient()) return false;
  return isSentinelState(window.history.state);
}

/**
 * 다음 popstate 부터 count 개만큼 `handlePopstate` 가 흡수(=상위 동작 안 함)하도록 표시.
 * router wrapper 가 sentinel 을 pop 하기 위해 `history.back()` 을 호출하기 직전에 사용한다.
 * 그렇지 않으면 `staleSentinelCount` 흡수 분기가 추가로 한 칸씩 history.back() 을 호출해
 * 의도치 않게 두 칸 이상 뒤로 가버린다.
 */
export function suppressNextPopstate(count = 1): void {
  if (count <= 0) return;
  suppressNextPop += count;
}

// 모듈 로드 시점(클라이언트 only — 파일 상단 'use client') 에 i18n bridge 에 자기 자신을 등록.
// router wrapper 가 이 bridge 를 통해 sentinel 상태를 조회/제어한다 (자세한 동작 근거는
// `@/i18n/back-stack-bridge.ts` 참조).
registerBackStackBridge({
  getSentinelCount: getBackStackSize,
  suppressNextPopstate,
});
