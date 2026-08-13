'use client';

/**
 * 브라우저 back/forward (popstate) 에 View Transition 을 적용한다.
 *
 * 배경
 * - `Link` / `router.push` 같은 push 네비게이션은 Next 의 `dispatchNavigateAction` 이
 *   `addTransitionType()` 을 호출해 React transition 으로 처리하므로 `<PageViewTransition>`
 *   (React `<ViewTransition>`) 이 자동으로 애니메이션한다.
 * - 그러나 back/forward 는 Next 가 `ACTION_RESTORE` 를 **의도적으로 urgent(비-transition)
 *   업데이트**로 처리한다 ("we don't want to add any delay on a back/forward nav"). urgent
 *   업데이트는 React `<ViewTransition>` 이 애니메이션하지 않으므로 popstate 전환은 무애니메이션이었다.
 *
 * 해결 — 라우터 이벤트와 분리해 우리가 직접 전환을 구동한다. native View Transition API 를
 * 그대로 쓰므로 기존 view-transitions.css 키프레임을 100% 재사용한다.
 *
 * 1. 모듈 로드 시점에 `history.pushState/replaceState` 에 단조 증가 인덱스를 스탬프해 둔다.
 *    popstate 의 `event.state` 인덱스를 직전 위치와 비교하면 back/forward 방향을 알 수 있다.
 * 2. popstate 리스너를 모듈 로드 시점에 등록한다 → Next/back-stack 의 `useEffect` 리스너보다
 *    먼저 실행된다. 라우트가 실제로 바뀌는 popstate 면 `stopImmediatePropagation()` 으로
 *    Next 의 즉시 RESTORE 를 막고 우리가 인수한다.
 * 3. `document.startViewTransition(update)` 를 호출한다. 브라우저가 OLD 스냅샷을 캡처한 뒤
 *    `update` 콜백이 실행되는데, 그 안에서 popstate 를 **재발생**시킨다. 재발생된 이벤트는
 *    Next 의 RESTORE 를 트리거하고, Next 의 DOM 교체는 이제 VT 캡처 윈도우 안에서 일어난다.
 * 4. `update` 가 반환한 promise 는 새 라우트가 React 에 commit 될 때까지 (= `<PopstateViewTransitionNotifier>`
 *    가 보고할 때까지) 대기한다. 그 시점에 브라우저가 NEW 스냅샷을 캡처하고 애니메이션을 실행한다.
 *
 * 적용 범위: 브라우저 back/forward 버튼, `router.back()`/`router.forward()`
 * (native history 위임 → popstate), Android 하드웨어 back (history.back 폴백 → popstate).
 *
 * 방향 정책
 * - 기본은 히스토리 인덱스 비교로 back(`nav-back`) / forward(`nav-forward`) 를 판정한다.
 * - 단, 출발/도착이 모두 하단 탭이면 (= 탭 전환으로 쌓인 히스토리) 히스토리 진행 방향이 아니라
 *   탭의 상대 위치 기반 lateral(`getTabLateralDirection`) 을 쓴다 — Link 클릭 시의 탭 전환 정책과 동일.
 *
 * 네이티브 UA 전환 중복 방지 (iOS swipe-back / Android 예측 뒤로가기 등)
 * - 브라우저가 back/forward 에 자체 전환 애니메이션(미리보기)을 이미 그렸다면 거기에 우리
 *   View Transition 까지 얹으면 전환이 중복된다.
 * - 정밀 신호: Navigation API `navigate` 이벤트의 `hasUAVisualTransition` — UA 가 이 네비게이션에
 *   대해 자체 시각 전환을 수행했으면 `true`. 이 값이 `true` 면 우리 전환을 인수하지 않는다.
 *   → iOS swipe-back(항상 미리보기) skip, iOS 뒤로가기 버튼/Android 일반 스와이프(미리보기 없음)
 *     run, Android 예측 뒤로가기(미리보기) skip — 플랫폼 분기 없이 케이스별로 정확히 갈린다.
 * - 폴백: Navigation API 또는 `hasUAVisualTransition` 미지원 브라우저(구형 iOS 등) 에서는
 *   플랫폼 휴리스틱(`isNativeGestureBackPlatformFallback`)으로 WebKit 의 비-programmatic
 *   popstate 를 인수하지 않는다.
 */

import { useIsomorphicLayoutEffect } from 'usehooks-ts';
import { usePathname } from '@/i18n/navigation';
import { isModalRoute } from '@/i18n/modal-route-bridge';
import { normalizePath } from '@/i18n/transition-direction';
import { getTransitionSuppression } from '@/i18n/transition-suppressor-bridge';
import { getBackStackSize, setLastPopstateDirection } from '../back-stack/back-stack';
import { HISTORY_IDX_KEY } from '../back-stack/history-entry-index';
import { DEFAULT_PAGE_VIEW_TRANSITION_NAME, wasLastOldCaptureClamped } from './page-view-transition';
import { getTabLateralDirection } from './tab-transition';

/**
 * layout 의 page-shell 컨테이너 div 에 부여하는 id. popstate 전환이 이 요소를 찾아
 * `view-transition-name` 을 부여하므로, layout 의 해당 div 에 같은 id 를 달아야 한다.
 */
export const PAGE_SHELL_ELEMENT_ID = 'app-page-shell';

/** 새 라우트 commit 보고가 끝내 오지 않을 때 (네비게이션 중단/에러) 전환을 풀어주는 안전 타임아웃. */
const READY_TIMEOUT_MS = 700;

/**
 * `transition.finished` 가 (hung WebView 등으로) 영영 settle 되지 않을 때 cleanup 을 강제하는
 * 워치독. 이게 없으면 `transitionInFlight` 이 영구 true 로 남아 이후 모든 popstate(=뒤로가기)가
 * 큐잉만 되고 막힌다. 정상 전환(애니메이션 수백 ms + ready 타임아웃 700ms)을 충분히 넘는 값.
 */
const CLEANUP_WATCHDOG_MS = 3000;

type HistoryDirection = 'nav-back' | 'nav-forward';
type PopstateDirection = HistoryDirection | 'nav-lateral-left' | 'nav-lateral-right' | 'nav-fade';

type ViewTransitionLike = { readonly finished: Promise<unknown> };
type StartViewTransition = (callback: () => unknown) => ViewTransitionLike;

/** programmatic 네비게이션 / UA 전환 신호를 유효하다고 볼 시간 창. */
const PROGRAMMATIC_NAV_WINDOW_MS = 500;

/**
 * Navigation API `navigate` 이벤트의 일부. lib.dom 타입에 `hasUAVisualTransition` 이 아직 없을 수
 * 있어 최소 형태만 직접 정의한다.
 */
type NavigateEventLike = Event & {
  readonly navigationType?: string;
  readonly hasUAVisualTransition?: boolean;
};

/**
 * 폴백 전용 — Navigation API 가 없거나 `hasUAVisualTransition` 을 보고하지 않는 구형 브라우저에서
 * 네이티브 제스처 백을 추정하기 위한 플랫폼 휴리스틱.
 * iOS 의 모든 브라우저는 WebKit 기반이라 swipe-back 이 네이티브로 애니메이션된다.
 * (Navigation API 가 있으면 이 값 대신 `hasUAVisualTransition` 으로 정밀 판정한다.)
 */
const isNativeGestureBackPlatformFallback = ((): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /AppleWebKit/.test(ua) && !/(Chrome|Chromium|Android|Edg\/)/.test(ua);
})();

// ─── 모듈 전역 상태 ──────────────────────────────────────────────────────────
/** 지금까지 발생한 pushState 횟수 = 가장 깊은 위치 인덱스. */
let navCounter = 0;
/** 현재 history 위치의 인덱스. */
let currentIdx = 0;

/**
 * 현재 history 엔트리의 위치 인덱스.
 * 엔트리 단위 상태 복원(가로 리스트 스크롤 등)에 사용 — 떠날 때의 인덱스와 같은 인덱스로
 * 되돌아온 마운트에서만 저장 상태를 복원하면 "뒤로가기 재진입"을 정확히 판별할 수 있다.
 * (forward 네비게이션은 pushState 로 새 인덱스를 받으므로 자연히 불일치.)
 */
export function getHistoryEntryIndex(): number {
  return currentIdx;
}
/** React 가 마지막으로 commit 한 라우트 (locale prefix 제거된 pathname). notifier 가 갱신. */
let lastCommittedPath = '';
/**
 * history idx → 떠날 당시의 스크롤 위치 맵. 다음에 그 entry 로 되돌아올 때 복원해 NEW 스냅샷이
 * 올바른 viewport 상태에서 캡처되도록 한다.
 *
 * 우리가 `history.scrollRestoration = 'manual'` 로 브라우저 자동 복원을 꺼두므로 (이유는
 * `installScrollRestorationOverride` 참조) popstate 의 모든 스크롤은 우리가 명시 관리한다.
 */
const scrollByIdx = new Map<
  number,
  {
    readonly x: number;
    readonly y: number;
    readonly anchor: { readonly rowIndex: number; readonly top: number } | null;
  }
>();
/**
 * popstate 이후 새 라우트 commit 시점에 복원할 스크롤 작업. 인수 여부와 무관하게 모든
 * popstate 에서 설정되고, notifier 가 라우트 commit 을 감지하면 소비한다.
 *
 * 인수된 popstate 는 `pending` 경로(scroll 복원 + OLD shift override + ready resolve)가
 * 우선 처리되므로 이 항목은 unused 가 된다. UA 제스처 백처럼 우리가 인수하지 않는 popstate
 * 에서만 실제로 쓰여, `'manual'` 모드 하에서도 스크롤이 정확히 복원되도록 한다.
 *
 * `destPath` 가 commit 된 pathname 과 일치할 때만 적용 → 그 사이 push 가 끼어들면 stale 처리해
 * 잘못된 entry 의 스크롤이 적용되지 않게 한다.
 */
let pendingPopstateRestore: { readonly idx: number; readonly destPath: string } | null = null;
/** 진행 중인 popstate 전환이 새 라우트 commit 을 기다리는 중이면 설정된다. */
let pending: {
  readonly destPath: string;
  /**
   * 이 leg 의 도착 history idx. 빠른 연속 back 으로 `currentIdx` 가 이미 다음 leg 로
   * 이동했어도, 이 leg 의 스크롤 복원은 자신의 destIdx 기준으로 한다.
   */
  readonly destIdx: number;
  readonly resolve: () => void;
  /** 전환 시작 시점(=OLD 캡처 직전)의 스크롤. OLD shift 재계산에 사용. */
  readonly oldScrollY: number;
} | null = null;
/** popstate 전환이 진행 중인지. 중첩 인수 방지. */
let transitionInFlight = false;
/**
 * 진행 중 전환 도중 발생한 popstate. coalesce: 항상 최신 1 개만 보관.
 * 현재 leg 의 cleanup 시점에 drain 해서 다음 leg 의 전환을 이어 시작 — 네이티브 앱처럼
 * 연속 back 시 각 leg 의 애니메이션이 차례대로 재생되게 한다. 3 연속 이상은 중간 leg 을
 * 1 개 건너뛰는 대신 마지막 leg 은 반드시 재생.
 */
let queuedPopstate: {
  readonly destPath: string;
  readonly destIdx: number;
  readonly historyDirection: HistoryDirection;
} | null = null;
/** 우리가 redispatch 한 합성 popstate 인지 표시 — true 면 리스너는 그대로 흘려보낸다. */
let reentrant = false;
/**
 * `history.back/forward/go` 가 JS 로 호출된 시각. 직후의 popstate 는 programmatic 으로 판정한다.
 * 0 이면 미설정. 네이티브 제스처 백은 JS 함수를 호출하지 않으므로 이 값이 갱신되지 않는다.
 */
let programmaticNavAt = 0;
/**
 * 직전 traverse `navigate` 이벤트가 보고한 UA 시각 전환 정보. popstate 직전에 갱신되고
 * `onPopState` 에서 한 번 소비된다. `supported: false` 면 `hasUAVisualTransition` 미보고
 * 브라우저 → 폴백 휴리스틱을 쓴다.
 */
let lastTraverseNavigate: {
  readonly supported: boolean;
  readonly hasUAVisualTransition: boolean;
  readonly at: number;
} | null = null;

// ─── history 인덱스 패치 ─────────────────────────────────────────────────────

/**
 * `history.pushState/replaceState` 를 감싸 매 entry 에 위치 인덱스를 스탬프한다.
 *
 * 모듈 로드 시점(= 어떤 useEffect 보다도 먼저)에 패치하므로, 이후 Next 의 app-router 가
 * useEffect 에서 pushState/replaceState 를 다시 패치해도 Next 의 래퍼가 우리 래퍼를 감싼다
 * (Next → ours → native). 따라서 Next 가 `copyNextJsInternalHistoryState` 로 state 를
 * 정제하더라도 그 다음 단계인 우리 래퍼가 인덱스를 다시 박으므로 스탬프가 항상 살아남는다.
 */
function installHistoryIndexPatch(): void {
  type PatchedHistory = History & { __appIdxPatched?: boolean };
  const history = window.history as PatchedHistory;
  if (history.__appIdxPatched) return;
  history.__appIdxPatched = true;

  // 새로고침 등으로 이미 스탬프된 entry 에 복귀한 경우 그 인덱스를 이어받는다.
  const initialState = window.history.state as Record<string, unknown> | null;
  const initialIdx =
    initialState && typeof initialState[HISTORY_IDX_KEY] === 'number' ? (initialState[HISTORY_IDX_KEY] as number) : 0;
  navCounter = initialIdx;
  currentIdx = initialIdx;
  lastCommittedPath = normalizePath(window.location.pathname);

  const originalPush = window.history.pushState.bind(window.history);
  const originalReplace = window.history.replaceState.bind(window.history);

  window.history.pushState = function patchedPushState(data, unused, url) {
    // 새 entry 로 떠나기 직전에 현재 entry 의 스크롤을 기록 → 나중에 back 으로 돌아올 때 복원.
    saveScrollForIdx(currentIdx);
    // 진행 중 정착 루프가 다음 페이지를 스크롤하지 못하게 중단.
    cancelScrollSettle();
    // 미소비 popstate restore 가 있다면 stale: push 가 끼어들었으므로 폐기 (잘못된 entry 적용 방지).
    pendingPopstateRestore = null;
    navCounter += 1;
    currentIdx = navCounter;
    return originalPush({ ...data, [HISTORY_IDX_KEY]: currentIdx }, unused, url);
  };
  // replace 는 같은 위치를 덮어쓰는 것이므로 인덱스를 증가시키지 않고 currentIdx 를 유지한다.
  window.history.replaceState = function patchedReplaceState(data, unused, url) {
    return originalReplace({ ...data, [HISTORY_IDX_KEY]: currentIdx }, unused, url);
  };

  // back/forward/go 를 감싸 "JS 가 일으킨 네비게이션" 임을 기록한다 — `router.back()` /
  // `router.forward()` 는 결국 이 함수들을 호출하므로, 직후의 popstate 를 네이티브 제스처 백과
  // 구분할 수 있다 (네이티브 제스처는 이 JS 함수를 거치지 않는다).
  const originalBack = window.history.back.bind(window.history);
  const originalForward = window.history.forward.bind(window.history);
  const originalGo = window.history.go.bind(window.history);
  window.history.back = function patchedBack() {
    programmaticNavAt = Date.now();
    return originalBack();
  };
  window.history.forward = function patchedForward() {
    programmaticNavAt = Date.now();
    return originalForward();
  };
  window.history.go = function patchedGo(delta) {
    programmaticNavAt = Date.now();
    return originalGo(delta);
  };
}

// ─── 스크롤 위치 저장/복원 ───────────────────────────────────────────────────

/**
 * c-v 리스트 행 컨벤션 셀렉터 (Tailwind arbitrary property).
 * 긴 리스트의 행 컴포넌트에 `[content-visibility:auto]` 클래스를 쓰는 컨벤션과 짝 —
 * 다른 컨벤션을 쓰면 이 셀렉터를 함께 바꾼다.
 */
const CV_ROW_SELECTOR = '[class*="[content-visibility:auto]"]';

/**
 * 스크롤 저장 시 함께 기록하는 c-v 리스트 앵커 — "몇 번째 행이 화면 어느 위치에 있었나".
 *
 * 절대 scrollY 만 저장하면 안 되는 이유: 뒤로가기 리마운트 직후 c-v 행들은 전부
 * `contain-intrinsic-size` 추정 높이로 레이아웃되고(`auto` 키워드의 실측 기억은 DOM 이 새로
 * 만들어지며 소실), 행당 실측−추정 오차가 복원 지점 위 행 수만큼 누적된다 — 리스트가 길수록
 * 절대값 복원이 크게 어긋난다 (Android·iOS 공통). 앵커 행을 저장 시점 화면 위치에 다시
 * 맞추는 방식은 위쪽 행들의 추정 오차와 무관하게 "보던 행"이 정확히 복원된다.
 */
type CvAnchor = { readonly rowIndex: number; readonly top: number };

function captureCvAnchor(): CvAnchor | null {
  // 최상단은 복원할 것이 없다. 얕은 스크롤도 위쪽 행들의 추정 오차로 수십 px 어긋날 수 있어
  // 스크롤이 조금이라도 있으면 항상 앵커를 기록한다 (첫 가시 행에서 루프가 바로 끝나 스캔 저렴).
  if (window.scrollY <= 0) return null;
  const rows = document.querySelectorAll<HTMLElement>(CV_ROW_SELECTOR);
  for (let i = 0; i < rows.length; i++) {
    const rect = rows[i]!.getBoundingClientRect();
    // 뷰포트 상단에 걸쳐 있거나 그 아래 첫 행 = 사용자가 보던 기준 행
    if (rect.bottom > 0) return { rowIndex: i, top: rect.top };
  }
  return null;
}

function saveScrollForIdx(idx: number): void {
  scrollByIdx.set(idx, { x: window.scrollX, y: window.scrollY, anchor: captureCvAnchor() });
}

/**
 * 저장된 스크롤을 복원하고 실제 적용된 y 를 반환한다.
 *
 * 앵커가 있으면 앵커 행 기준으로 복원한다 (위 CvAnchor 주석 참고). 강제 렌더로 앵커 주변
 * 행들의 높이가 추정→실측으로 바뀌면 앵커 위치도 밀리므로, 같은 프레임(페인트 전)에 한 번
 * 재측정해 보정하고, 이후의 지연 렌더 밀림은 `settleAnchorRestore` 정착 루프가 잡는다.
 */
function restoreScrollForIdx(idx: number): number {
  cancelScrollSettle();
  const saved = scrollByIdx.get(idx) ?? { x: 0, y: 0, anchor: null };
  const anchor = saved.anchor;
  if (anchor) {
    const rows = document.querySelectorAll<HTMLElement>(CV_ROW_SELECTOR);
    const row = rows[anchor.rowIndex];
    if (row) {
      window.scrollTo(saved.x, row.getBoundingClientRect().top + window.scrollY - anchor.top);
      forceRenderCvRowsInViewport();
      const target = Math.max(0, row.getBoundingClientRect().top + window.scrollY - anchor.top);
      window.scrollTo(saved.x, target);
      settleAnchorRestore(saved.x, anchor);
      return target;
    }
    // 앵커 행이 아직 마운트 전(인피니트 쿼리 후속 페이지 지연 마운트 등)일 수 있다 —
    // 절대값으로 우선 복원하고, 정착 루프가 행이 등장하는 시점에 앵커 위치로 재보정한다.
    // (캐시 만료로 행이 영영 안 생기면 루프가 아무것도 안 하고 끝난다 — 절대값 폴백 유지.)
    window.scrollTo(saved.x, saved.y);
    forceRenderCvRowsInViewport();
    settleAnchorRestore(saved.x, anchor);
    return saved.y;
  }
  window.scrollTo(saved.x, saved.y);
  forceRenderCvRowsInViewport();
  return saved.y;
}

/** 복원 후 앵커 재보정 정착 루프의 지속 프레임 수 (~400ms @60fps). */
const SETTLE_FRAMES = 24;

/** 진행 중인 정착 루프의 취소 함수. 새 복원·네비게이션 시작 시 반드시 먼저 취소한다. */
let settleCancel: (() => void) | null = null;

function cancelScrollSettle(): void {
  settleCancel?.();
}

/**
 * 복원 직후 짧은 시간 동안 앵커 행의 뷰포트 위치를 프레임마다 재보정한다.
 *
 * 동기 복원이 같은 프레임에 한 번 재측정하더라도, 그 뒤 브라우저가 뷰포트 주변의 c-v 행들을
 * 지연 렌더하면서 (추정 높이 → 실측) 앵커 위쪽 문서 높이가 바뀌어 복원 지점이 몇 px~수십 px
 * 밀린다 — c-v 리스트는 `overflow-anchor: none` 이라 브라우저 scroll anchoring 보정도 없다.
 * 이미지 지연 로드·인피니트 쿼리 후속 페이지 마운트도 같은 밀림을 만든다. 복원 시점에 문서가
 * 짧아 scrollTo 가 클램프된 경우도 문서가 자라는 대로 루프가 마저 복원한다.
 *
 * 사용자 입력(휠/터치/키)이 시작되면 즉시 중단해 사용자 스크롤과 싸우지 않는다.
 * (전환 중엔 `.app-vt-in-flight` 입력 락이 걸려 있어 충돌 여지도 없다.)
 */
function settleAnchorRestore(x: number, anchor: CvAnchor): void {
  cancelScrollSettle();
  let rafId = 0;
  const cancel = (): void => {
    window.cancelAnimationFrame(rafId);
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
    window.removeEventListener('keydown', cancel);
    if (settleCancel === cancel) settleCancel = null;
  };
  settleCancel = cancel;
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('keydown', cancel);

  let frames = 0;
  const tick = (): void => {
    frames += 1;
    const row = document.querySelectorAll<HTMLElement>(CV_ROW_SELECTOR)[anchor.rowIndex];
    if (row) {
      const target = Math.max(0, row.getBoundingClientRect().top + window.scrollY - anchor.top);
      if (Math.abs(window.scrollY - target) > 1) window.scrollTo(x, target);
    }
    if (frames < SETTLE_FRAMES) rafId = window.requestAnimationFrame(tick);
    else cancel();
  };
  rafId = window.requestAnimationFrame(tick);
}

/**
 * 복원된 스크롤 위치의 `content-visibility: auto` 리스트 행을 같은 프레임에 강제 렌더한다.
 *
 * c-v:auto 로 스킵된 행(리마운트 직후엔 전부 미렌더)은 프로그래매틱 스크롤 점프 직후 첫 페인트에
 * 빈 placeholder 로 그려지고 다음 프레임에야 콘텐츠가 채워진다(WebKit). 인수 경로에선 VT 스냅샷이
 * 이 빈 프레임을 가리지만, UA 제스처 백(iOS 스와이프)은 가림막이 없어 UA 미리보기 스냅샷이 걷힌
 * 순간 리스트 전체가 한 번 "깜빡"이는 것으로 보였다 (스크롤이 깊은 c-v 리스트 전용 증상 —
 * 얕은 리스트는 복원 지점 행들이 초기 렌더에 포함돼 무증상).
 *
 * scrollTo 직후(layout effect, 페인트 전) 뷰포트(±50%)와 교차하는 행에 일시적으로
 * `content-visibility: visible` 을 인라인 지정해 첫 페인트에 렌더시키고, 두 프레임 뒤 인라인을
 * 제거한다 — 그 시점엔 이미 화면 안이라 `auto` 로 되돌려도 렌더가 유지되고, 화면 밖 행들의
 * 렌더/디코딩 스킵(OOM 방지)은 그대로 보존된다.
 */
function forceRenderCvRowsInViewport(): void {
  const rows = document.querySelectorAll<HTMLElement>(CV_ROW_SELECTOR);
  if (rows.length === 0) return;
  const margin = window.innerHeight * 0.5;
  const touched: HTMLElement[] = [];
  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    if (rect.bottom < -margin || rect.top > window.innerHeight + margin) continue;
    row.style.setProperty('content-visibility', 'visible');
    touched.push(row);
  }
  if (touched.length === 0) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const row of touched) row.style.removeProperty('content-visibility');
    })
  );
}

/**
 * pop 케이스의 OLD shift 보정값을 설정한다.
 *
 * `page-view-transition.tsx` 가 패치한 `startViewTransition` 은 호출 시점에
 * `--app-vt-old-shift: -OLD_scrollY` 를 박는데, 이는 NEW 가 항상 scroll 0(=push) 인
 * 전제다. pop 으로 돌아온 NEW 페이지가 0 이 아닌 saved scroll 로 복원되면 view-transition-group
 * 박스가 NEW 기준(top:-NEW_scrollY)으로 잡혀 OLD 스냅샷이 잘못된 위치(NEW 의 중간)에 그려진다.
 *
 * 올바른 공식: translateY = NEW_scrollY - OLD_scrollY. 이 값으로 덮어쓴다.
 * NEW 캡처 직전(=ready resolve 직전)에 호출해야 키프레임이 정확한 값으로 시작한다.
 *
 * 단, OLD 캡처가 뷰포트 클램프로 찍힌 경우(`wasLastOldCaptureClamped`) 스냅샷에 OLD 스크롤이
 * 이미 반영돼 있으므로 유효 OLD 스크롤을 0 으로 취급한다 (공식: translateY = NEW_scrollY).
 */
function applyPopOldShiftOverride(oldScrollY: number, newScrollY: number): void {
  const effectiveOldScrollY = wasLastOldCaptureClamped() ? 0 : oldScrollY;
  document.documentElement.style.setProperty('--app-vt-old-shift', `${Math.round(newScrollY - effectiveOldScrollY)}px`);
}

// ─── popstate 인수 ───────────────────────────────────────────────────────────

/** 스크롤 캡처 패치가 적용된 `document.startViewTransition` 을 돌려준다. 미지원 시 null. */
function getStartViewTransition(): StartViewTransition | null {
  const fn = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  return typeof fn === 'function' ? fn.bind(document) : null;
}

/**
 * 합성 popstate 를 발생시켜 Next(및 back-stack/nuqs 등 나머지 리스너)가 실제 네비게이션을
 * 수행하게 한다. `reentrant` 플래그로 우리 리스너는 이 이벤트를 그대로 흘려보낸다.
 */
function redispatchPopstate(): void {
  reentrant = true;
  try {
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  } finally {
    reentrant = false;
  }
}

function takeOverPopstate(args: {
  readonly direction: PopstateDirection;
  readonly destPath: string;
  readonly destIdx: number;
  readonly shell: HTMLElement;
  readonly startViewTransition: StartViewTransition;
}): void {
  const { direction, destPath, destIdx, shell, startViewTransition } = args;
  const directionClass = `app-vt-${direction}`;

  transitionInFlight = true;
  // OLD 캡처 직전의 스크롤 — NEW commit 시점에 OLD shift 를 NEW-OLD 공식으로 재계산하는 데 필요.
  const oldScrollY = window.scrollY;
  // page-shell 그룹 분리: layout 의 컨테이너 div 가 OLD/NEW 스냅샷 단위가 되어 슬라이드가
  // 컨테이너 안에 한정된다 (React `<ViewTransition name="page-shell">` 의 push 경로와 동일).
  shell.style.viewTransitionName = DEFAULT_PAGE_VIEW_TRANSITION_NAME;
  // `:root.app-vt-nav-*` 셀렉터로 view-transitions.css 의 push/pop 키프레임을 매칭시킨다.
  // (`startViewTransition({ types })` 옵션은 구형 WebView 미지원이라 클래스 방식을 쓴다.)
  document.documentElement.classList.add(directionClass);

  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  pending = { destPath, destIdx, resolve: resolveReady, oldScrollY };

  const fallbackTimer = window.setTimeout(resolveReady, READY_TIMEOUT_MS);

  let cleanedUp = false;
  let watchdogTimer = 0;
  const cleanup = (): void => {
    if (cleanedUp) return; // 워치독과 finished.finally 가 모두 호출해도 1회만 실행 (멱등)
    cleanedUp = true;
    window.clearTimeout(fallbackTimer);
    window.clearTimeout(watchdogTimer);
    shell.style.viewTransitionName = '';
    document.documentElement.classList.remove(directionClass);
    transitionInFlight = false;
    if (pending && pending.resolve === resolveReady) pending = null;
    // 진행 중 도착한 popstate 가 있으면 이어서 처리 (네이티브 앱처럼 leg 별 애니메이션을 연쇄).
    drainQueuedPopstate();
  };

  // transition.finished 가 끝내 settle 되지 않아도 전환 락이 영구 고착되지 않도록 강제 해제.
  watchdogTimer = window.setTimeout(cleanup, CLEANUP_WATCHDOG_MS);

  try {
    // update 콜백은 브라우저가 OLD 스냅샷을 캡처한 직후 실행된다. 여기서 popstate 를
    // 재발생시키면 Next 의 RESTORE DOM 교체가 VT 캡처 윈도우 안에서 일어나고, NEW 스냅샷은
    // ready(= 새 라우트 commit) 까지 미뤄진다.
    const transition = startViewTransition(() => {
      redispatchPopstate();
      return ready;
    });
    Promise.resolve(transition.finished).finally(cleanup);
  } catch {
    // startViewTransition 자체가 실패하면 네비게이션을 잃지 않도록 즉시 위임한다.
    cleanup();
    redispatchPopstate();
  }
}

function onPopState(event: PopStateEvent): void {
  // 우리가 redispatch 한 합성 이벤트 — Next/back-stack/nuqs 로 그대로 흘려보낸다.
  if (reentrant) return;

  // 직전 복원의 정착 루프가 아직 돌고 있다면 중단 — 떠나는 entry 의 스크롤 기록(아래
  // saveScrollForIdx)과 다음 entry 복원에 끼어들지 못하게 한다.
  cancelScrollSettle();

  // 1) 방향 판정 + 인덱스 갱신. 인수 여부와 무관하게 항상 먼저 수행해 추적 상태를 정확히 유지한다.
  const destState = event.state as Record<string, unknown> | null;
  const destIdx =
    destState && typeof destState[HISTORY_IDX_KEY] === 'number' ? (destState[HISTORY_IDX_KEY] as number) : null;

  let historyDirection: HistoryDirection | null = null;
  if (destIdx !== null) {
    // currentIdx 갱신 전: 떠나는 entry 의 스크롤을 기록 → 다음에 그 entry 로 돌아올 때 복원.
    saveScrollForIdx(currentIdx);
    if (destIdx < currentIdx) historyDirection = 'nav-back';
    else if (destIdx > currentIdx) historyDirection = 'nav-forward';
    currentIdx = destIdx;
    // back-stack 의 sentinel 흡수가 올바른 방향으로 건너뛰도록 방향 신호를 공유한다.
    // (인수하지 않고 bail 하는 popstate — 예: sentinel 처럼 URL 이 안 바뀌는 경우 — 에서도
    //  이 값이 미리 설정돼 있어야 back-stack 이 forward 를 잘못된 방향으로 되돌리지 않는다.)
    if (historyDirection) setLastPopstateDirection(historyDirection === 'nav-forward' ? 'forward' : 'back');
    // 인수 여부와 무관하게 복원 작업을 예약. 인수되는 경로는 `pending` 이 우선 처리하므로
    // 이 값은 unused 가 되지만, UA 제스처 백처럼 인수하지 않는 popstate 에서는 notifier 가
    // 이 값을 보고 스크롤만 복원한다 (`'manual'` 모드 하에서 브라우저 자동 복원 부재 보정).
    pendingPopstateRestore = { idx: destIdx, destPath: normalizePath(window.location.pathname) };
  }

  // programmatic 플래그 / UA 전환 정보는 popstate 당 한 번만 소비한다.
  const isProgrammatic = programmaticNavAt !== 0 && Date.now() - programmaticNavAt < PROGRAMMATIC_NAV_WINDOW_MS;
  programmaticNavAt = 0;
  const navInfo = lastTraverseNavigate;
  lastTraverseNavigate = null;

  // 2) 인수 조건 검사 — 하나라도 어긋나면 기본 동작(Next 의 즉시 RESTORE)에 맡긴다.
  if (historyDirection === null || destIdx === null) return; //  방향 불명 (앱 외부에서 만든 entry 등)
  if (getBackStackSize() > 0) return; //                  모달/바텀시트 닫힘 — back-stack 에 위임
  // UA(브라우저)가 이미 자체 전환(미리보기)을 그렸으면 우리 전환을 얹지 않는다 → 중복 방지.
  // 정밀 신호인 Navigation API `hasUAVisualTransition` 을 우선 쓰고, 미보고 브라우저에서만
  // 플랫폼 휴리스틱으로 폴백한다 (구형 iOS = WebKit 의 비-programmatic popstate 를 제스처로 간주).
  if (navInfo !== null && navInfo.supported && Date.now() - navInfo.at < PROGRAMMATIC_NAV_WINDOW_MS) {
    if (navInfo.hasUAVisualTransition) return; //         UA 가 이미 시각 전환 수행 → skip
  } else if (isNativeGestureBackPlatformFallback && !isProgrammatic) {
    return; //                                            폴백: WebKit 네이티브 제스처 백으로 간주
  }
  const startViewTransition = getStartViewTransition();
  if (!startViewTransition) return; //                    View Transition 미지원 환경

  const destPath = normalizePath(window.location.pathname);
  if (destPath === lastCommittedPath) return; //          라우트 변경 없음 (해시/쿼리/sentinel)
  // 출발/도착 중 하나라도 modal route 면 인수 skip — Portal modal 은 페이지 슬라이드가
  // 부적절하다 (지나가는 페이지의 콘텐츠가 modal 위로 비치거나, 같은 page-shell 이 슬라이드).
  if (isModalRoute(lastCommittedPath) || isModalRoute(destPath)) return;
  // 특정 라우트 쌍 사이의 back/forward — Link 클릭과 동일하게 'none' 이면 인수 skip(하드컷),
  // 'fade' 면 방향 슬라이드 대신 crossfade 로 인수한다.
  const suppression = getTransitionSuppression(lastCommittedPath, destPath);
  if (suppression === 'none') return;

  const shell = document.getElementById(PAGE_SHELL_ELEMENT_ID);
  if (!(shell instanceof HTMLElement)) return; //         page-shell 컨테이너 부재

  // 3) 진행 중 전환이 있으면 큐잉만 하고 cleanup 에서 이어 처리한다. propagation 차단 필수 —
  // 그렇지 않으면 Next 의 urgent RESTORE 가 끼어들어 첫 leg 이 끝나기 전 DOM 이 최종 위치로 점프,
  // 두번째 leg 의 애니메이션이 사라진다.
  if (transitionInFlight) {
    event.stopImmediatePropagation();
    queuedPopstate = { destPath, destIdx, historyDirection };
    return;
  }

  // 탭↔탭 이동(탭 네비게이터로 쌓인 히스토리)이면 히스토리 진행 방향 대신 탭의 상대 위치 기반
  // lateral 방향을 쓴다 — Link 클릭 시의 탭 전환 정책과 동일하게.
  const direction: PopstateDirection =
    suppression === 'fade' ? 'nav-fade' : (getTabLateralDirection(lastCommittedPath, destPath) ?? historyDirection);

  // 4) 인수 — Next 의 즉시 RESTORE 를 막고 VT 안에서 다시 발생시킨다.
  event.stopImmediatePropagation();
  takeOverPopstate({ direction, destPath, destIdx, shell, startViewTransition });
}

/**
 * 큐에 대기 중인 popstate 를 다음 leg 으로 시작한다. 직전 leg 의 cleanup 에서 호출.
 *
 * 처리 시점에 조건을 재검사: 그 사이 라우트가 바뀌어 modal 이 되거나 back-stack 이 열렸을
 * 수 있다. 재검사에서 인수 부적격이면 전환 없이 redispatch 로 이벤트를 놓아준다 (원본은 이미
 * 차단됐으므로 버리면 네비게이션이 유실된다). lateral 방향도 갱신된 `lastCommittedPath` 기준으로
 * 다시 계산.
 *
 * 동작: `takeOverPopstate` 가 update 콜백에서 `redispatchPopstate()` 로 합성 popstate 를
 * 발생시키면, 그 시점의 `window.history.state` (= 마지막 queued leg 의 state) 가 실리고
 * Next 는 현재 DOM 의 라우트에서 큐의 도착지로 정상 네비게이션한다.
 */
function drainQueuedPopstate(): void {
  const q = queuedPopstate;
  if (!q) return;
  queuedPopstate = null;
  // 인수를 포기하는 모든 분기는 이벤트를 버리지 말고 재발행한다 — 큐잉 시점에 원본 popstate 를
  // stopImmediatePropagation 으로 차단했으므로, 여기서 조용히 버리면 그 네비게이션을 아무도
  // 처리하지 못해 URL 과 Next 라우터 상태(useSearchParams 등)가 영구 desync 된다.
  // 특히 destPath 는 query 를 뗀 pathname 이라, 같은 경로에서 query 만 다른 leg
  // (예: 필터 바텀시트 sentinel 엔트리 위에서 필터 변경 뒤 연속 back) 이 첫 분기에 걸린다.
  if (q.destPath === lastCommittedPath) return redispatchPopstate();
  if (isModalRoute(lastCommittedPath) || isModalRoute(q.destPath)) return redispatchPopstate();
  const suppression = getTransitionSuppression(lastCommittedPath, q.destPath);
  if (suppression === 'none') return redispatchPopstate();
  if (getBackStackSize() > 0) return redispatchPopstate();
  const startViewTransition = getStartViewTransition();
  if (!startViewTransition) return redispatchPopstate();
  const shell = document.getElementById(PAGE_SHELL_ELEMENT_ID);
  if (!(shell instanceof HTMLElement)) return redispatchPopstate();
  const direction: PopstateDirection =
    suppression === 'fade' ? 'nav-fade' : (getTabLateralDirection(lastCommittedPath, q.destPath) ?? q.historyDirection);
  takeOverPopstate({ direction, destPath: q.destPath, destIdx: q.destIdx, shell, startViewTransition });
}

/**
 * notifier 가 호출한다. React 가 새 라우트를 commit 하면 대기 중인 popstate 전환의
 * NEW 스냅샷 캡처를 진행시킨다.
 *
 * 이 시점에 (1) 목적지 entry 의 저장된 스크롤을 동기 복원하고, (2) OLD shift 를 pop 공식으로
 * 덮어쓴 뒤 ready 를 resolve 한다. 브라우저는 ready resolve 직후 NEW 스냅샷을 캡처하므로,
 * 두 작업이 캡처보다 먼저 실행되어 "잠깐 scroll 0 으로 보였다가 복원되는" 깜빡임을 차단한다.
 *
 * useLayoutEffect 에서 호출하면 React commit 직후 paint 전에 실행되므로, Next App Router 가
 * urgent RESTORE 로 DOM 만 바꾸고 스크롤은 미복원인 한 프레임 동안의 잘못된 viewport 가
 * 사용자에게 노출되지 않는다.
 */
function reportRouteCommitted(path: string): void {
  lastCommittedPath = path;
  if (pending && pending.destPath === path) {
    // 인수된 popstate: 스크롤 복원 + OLD shift 재계산 + ready resolve (NEW 캡처 진행).
    // `pending.destIdx` 사용 — 연속 back 으로 currentIdx 가 이미 다음 leg 로 이동했어도
    // 이 leg 의 도착지 기준으로 스크롤을 복원한다. (앵커 복원 + 복원 지점 행 강제 렌더 포함)
    const restoredY = restoreScrollForIdx(pending.destIdx);
    applyPopOldShiftOverride(pending.oldScrollY, restoredY);
    pending.resolve();
    pending = null;
    pendingPopstateRestore = null;
    return;
  }
  if (pendingPopstateRestore && pendingPopstateRestore.destPath === path) {
    // 비-인수 popstate (UA 제스처 백, 모달 close 외 라우트 변경 등): 스크롤만 복원.
    // 'manual' 모드 하에서 브라우저 자동 복원이 없으므로 우리가 직접 옮긴다.
    // (앵커 복원 + UA 미리보기가 걷힌 직후 첫 페인트의 빈 c-v 행 깜빡임 방지 강제 렌더 포함)
    restoreScrollForIdx(pendingPopstateRestore.idx);
    pendingPopstateRestore = null;
  }
}

// ─── 설치 (모듈 로드 시점, 클라이언트에서만) ─────────────────────────────────

/**
 * Navigation API `navigate` 이벤트를 관찰해 traverse(back/forward) 네비게이션의
 * `hasUAVisualTransition` 을 기록한다. `navigate` 는 짝이 되는 `popstate` 직전에 발생하므로,
 * `onPopState` 가 이 값을 읽어 UA 가 이미 전환을 그렸는지 정밀 판정한다.
 * Next 는 라우팅에 이 API 를 쓰지 않으므로(우리는 `intercept()` 하지 않고 관찰만 한다) 안전하다.
 */
function installNavigateObserver(): void {
  const navigation = (window as Window & { navigation?: EventTarget }).navigation;
  if (!navigation) return; // Navigation API 미지원 → 폴백 휴리스틱 사용
  navigation.addEventListener('navigate', (event: Event) => {
    const navigateEvent = event as NavigateEventLike;
    if (navigateEvent.navigationType !== 'traverse') return;
    const flag = navigateEvent.hasUAVisualTransition;
    lastTraverseNavigate = {
      // 일부 브라우저는 Navigation API 는 있어도 `hasUAVisualTransition` 은 미보고 → supported=false.
      supported: typeof flag === 'boolean',
      hasUAVisualTransition: flag === true,
      at: Date.now(),
    };
  });
}

/**
 * `history.scrollRestoration` 을 `'manual'` 로 강제한다.
 *
 * 기본값 `'auto'` 에서 Chromium 등은 popstate 처리 도중 브라우저 자동 스크롤 복원을 끼워넣어
 * `SVT:call ~ OLD 캡처` 사이에 `window.scrollY` 가 바뀌어 버린다. 그 결과:
 *   - OLD 가 사용자가 보던 위치가 아닌 다른 스크롤에서 캡처돼 슬라이드 아웃되는 OLD 가 시각적으로 점프
 *   - `oldScrollY` 추적값(SVT:call 직전 sync scrollY) 과 실제 OLD 캡처 scrollY 가 어긋나
 *     OLD shift 보정 공식이 잘못된 값을 산출
 *
 * `'manual'` 로 바꿔 브라우저가 끼어들지 못하게 하고, 모든 스크롤 복원은 우리가:
 *   - 인수 popstate: `reportRouteCommitted` 의 `pending` 경로
 *   - 비-인수 popstate (UA 제스처 등): `reportRouteCommitted` 의 `pendingPopstateRestore` 경로
 *   - push: Next 의 ScrollAndFocusHandler (기존대로)
 */
function installScrollRestorationOverride(): void {
  if (!('scrollRestoration' in window.history)) return;
  window.history.scrollRestoration = 'manual';
}

function installPopstateViewTransition(): void {
  if (typeof window === 'undefined') return;
  type FlaggedWindow = Window & { __appPopstateVtInstalled?: boolean };
  const w = window as FlaggedWindow;
  if (w.__appPopstateVtInstalled) return;
  w.__appPopstateVtInstalled = true;

  installScrollRestorationOverride();
  installHistoryIndexPatch();
  installNavigateObserver();
  // 모듈 로드 시점 등록 → Next/back-stack 의 useEffect 리스너보다 먼저 실행되어
  // stopImmediatePropagation() 으로 그들의 처리를 가로챌 수 있다.
  window.addEventListener('popstate', onPopState);
}

installPopstateViewTransition();

// ─── notifier 컴포넌트 ───────────────────────────────────────────────────────

/**
 * 라우트 commit 시점을 popstate 전환 엔진에 보고하는 effect-only 컴포넌트.
 * `usePathname()` 이 바뀌면 = React 가 새 라우트를 commit 했다는 뜻이므로, 대기 중인
 * popstate 전환이 그 시점에 NEW 스냅샷을 캡처하도록 한다.
 *
 * layout 의 클라이언트 트리 안 (NextIntlClientProvider 하위) 에 한 번 마운트한다.
 */
export function PopstateViewTransitionNotifier(): null {
  const pathname = usePathname();
  // useLayoutEffect: React commit 직후 paint 전에 실행 — Next 의 urgent RESTORE 가 DOM 만 바꾸고
  // 스크롤은 미복원인 상태로 paint 되는 한 프레임을 차단한다. NEW 스냅샷 캡처(=ready resolve 후)
  // 전에 동기적으로 스크롤이 복원되도록 보장.
  useIsomorphicLayoutEffect(() => {
    reportRouteCommitted(normalizePath(pathname));
  }, [pathname]);
  return null;
}
