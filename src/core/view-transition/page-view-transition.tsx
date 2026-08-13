'use client';

// React.ViewTransition 은 stable export 가 아니므로 react canary 의 symbol 을 직접 참조한다.
// App Router 는 Next 가 번들한 react canary 를 쓰고 그 채널이 ViewTransition symbol 을 export 하므로,
// 앱 코드는 `import * as React from 'react'` 만으로 접근 가능하다.
// (Next 16.3 부터 무설정 — 이전에 필요하던 `experimental.viewTransition: true` 플래그는 제거됐다.)
import * as React from 'react';
import { type PropsWithChildren, createElement } from 'react';

import { NAV_TRANSITION_TYPES } from '@/i18n/transition-direction';

/**
 * NavTransitionType 와 동일 이름의 클래스를 pseudo 에 부여하기 위한 enter/exit map.
 * `<ViewTransition>` 가 transitionType 'nav-forward' 를 받으면 pseudo 에 `.nav-forward` 클래스가
 * 적용되고, view-transitions.css 의 `::view-transition-old(.nav-forward)` 셀렉터가 매칭된다.
 *
 * `default: 'none'` — 전환 타입이 지정되지 않은 업데이트(같은 경로 쿼리 변경, raw next router 경유 등)는
 * 전환을 활성화하지 않는다. 없으면 React 가 기본 크로스페이드 VT 를 돌려 쿼리-온리 내비게이션마다
 * 화면이 번쩍이고 입력이 잠깐 잠긴다. 페이지 전환은 항상 `@/i18n/navigation` 이 명시 타입을
 * 주입하므로 정상 전환에는 영향 없음.
 */
const ENTER_EXIT_MAP = {
  ...(Object.fromEntries(NAV_TRANSITION_TYPES.map((t) => [t, t])) as Record<
    (typeof NAV_TRANSITION_TYPES)[number],
    string
  >),
  default: 'none',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REACT_VIEW_TRANSITION = (React as any).ViewTransition as unknown;

/** 기본 ViewTransition group 이름. view-transitions.css 의 셀렉터와 짝. */
export const DEFAULT_PAGE_VIEW_TRANSITION_NAME = 'page-shell';

/**
 * page-shell DOM id. `popstate-view-transition.tsx` 의 `PAGE_SHELL_ELEMENT_ID` 와 동일 값 —
 * 그 모듈을 import 하면 순환이 생겨 로컬 상수로 둔다.
 */
const PAGE_SHELL_ID = 'app-page-shell';

/**
 * 직전 클램프의 원복 함수. 전환이 겹쳐 새 클램프가 시작될 때 아직 원복되지 않은 이전
 * 클램프가 있으면 (skip 된 전환의 update 가 아직 안 돈 극단 케이스) 먼저 되돌려, 이전
 * 클램프 스타일을 "원래 값"으로 오인해 저장하는 것을 막는다.
 */
let pendingShellClampRestore: (() => void) | null = null;

/**
 * 직전 startViewTransition 의 OLD 캡처가 뷰포트 클램프로 찍혔는지. 클램프된 스냅샷은
 * OLD 스크롤이 이미 반영된 "보던 화면" 그대로라, popstate 모듈이 pop 케이스의
 * `--app-vt-old-shift` 를 재계산할 때 유효 OLD 스크롤을 0 으로 취급해야 한다
 * (`popstate-view-transition.tsx` 의 `applyPopOldShiftOverride`).
 */
let lastOldCaptureClamped = false;

export function wasLastOldCaptureClamped(): boolean {
  return lastOldCaptureClamped;
}

/**
 * **OLD 스냅샷 뷰포트 클램프 — View Transition 메모리 최적화의 핵심.**
 *
 * page-shell 은 페이지 콘텐츠 전체 높이를 갖는 div 라, 전환 시 브라우저가 OLD 스냅샷을
 * `요소 전체 높이 × 폭 × devicePixelRatio² × 4byte` 비트맵 텍스처로 캡처·유지한다
 * (Chromium 실측: 7,986px 페이지 → 캡처 이미지 7,985.61px, object-view-box 클립 없음).
 * 긴 리스트 페이지에서는 이것이 수십 MB 스파이크가 되고, 물리 픽셀 높이가 GPU 최대
 * 텍스처 크기를 넘으면 전환 자체가 InvalidStateError 로 abort 되기도 한다.
 *
 * 해결: OLD 캡처 직전(= original startViewTransition 호출 전, 같은 스타일 패스)에
 * page-shell 을 "사용자가 보고 있던 뷰포트 슬라이스"로 일시 축소하고, 캡처가 끝난 직후
 * (= update 콜백 첫 줄, 화면은 이미 frozen OLD 이미지가 덮고 있어 사용자에게 안 보임)
 * 원복한다. 캡처물이 정확히 "보던 화면"이므로 스냅샷은 뷰포트 크기로 캡핑된다.
 *
 * 시각 동작은 기존과 동일하다:
 * - 클램프 슬라이스가 이미 스크롤 위치를 반영하므로 `--app-vt-old-shift` 는 0 이 된다
 *   (기존: 전체 높이 스냅샷을 translateY 로 끌어내려 같은 슬라이스를 보여줌 — 결과 동일).
 * - 문서 높이를 `<html> min-height` 로 고정해 window 스크롤이 리셋되지 않는다
 *   (스크롤 이벤트·Next 히스토리 스크롤 저장 모두 무영향).
 * - box 이동은 `position: relative + top` 으로 처리 — transform 을 쓰면 shell 이 fixed
 *   자손(플로팅 버튼 등)의 containing block 이 되어 캡처 프레임에서 위치가 틀어진다.
 * - 내부 콘텐츠 슬라이스는 `overflow: hidden + scrollTop` 으로 선택 — sticky 헤더는
 *   스크롤포트가 window → shell 로 바뀌어도 같은 위치에 붙는다.
 *
 * @returns 원복 함수. 셸이 없거나 페이지가 뷰포트보다 짧아 클램프가 무의미하면 null
 *          (이 경우 기존 `--app-vt-old-shift` 경로가 그대로 동작).
 */
function clampShellForOldCapture(): (() => void) | null {
  const shell = document.getElementById(PAGE_SHELL_ID);
  if (!shell) return null;

  const viewportHeight = Math.ceil(window.innerHeight);
  const shellHeight = shell.offsetHeight;
  if (shellHeight <= viewportHeight + 1) return null;

  // 겹침 방어: 이전 전환의 클램프가 아직 원복 전이면 먼저 되돌린다 (아래 prev 저장 오염 방지).
  pendingShellClampRestore?.();

  const rect = shell.getBoundingClientRect();
  // 요소 내부에서 현재 보이는 슬라이스의 시작 offset. 최대값은 "요소 끝 - 뷰포트" (elastic 스크롤 방어).
  const sliceTop = Math.min(Math.max(0, Math.round(-rect.top)), shellHeight - viewportHeight);

  const html = document.documentElement;
  const prev = {
    htmlMinHeight: html.style.minHeight,
    height: shell.style.height,
    minHeight: shell.style.minHeight,
    overflow: shell.style.overflow,
    position: shell.style.position,
    top: shell.style.top,
  };

  // 순서 중요: 문서 높이 고정 → 셸 축소 → 슬라이스 스크롤. (셸 축소로 문서가 줄면
  // window 스크롤이 클램프되며 캡처 프레임에 스크롤 리스너 부작용이 끼어들 수 있다.)
  html.style.minHeight = `${html.scrollHeight}px`;
  shell.style.height = `${viewportHeight}px`;
  shell.style.minHeight = '0';
  shell.style.overflow = 'hidden';
  if (sliceTop > 0) {
    shell.style.position = 'relative';
    shell.style.top = `${sliceTop}px`;
  }
  shell.scrollTop = sliceTop;

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    if (pendingShellClampRestore === restore) pendingShellClampRestore = null;
    shell.scrollTop = 0;
    shell.style.height = prev.height;
    shell.style.minHeight = prev.minHeight;
    shell.style.overflow = prev.overflow;
    shell.style.position = prev.position;
    shell.style.top = prev.top;
    html.style.minHeight = prev.htmlMinHeight;
  };
  pendingShellClampRestore = restore;
  return restore;
}

/** startViewTransition 인수(함수 | { update, types })의 update 앞에 클램프 원복을 끼워 넣는다. */
function injectClampRestoreIntoArgs(args: unknown[], restoreClamp: () => void): unknown[] {
  const rawArg = args[0] as undefined | (() => unknown) | { update?: (() => unknown) | null };
  const wrapUpdate = (update: (() => unknown) | null | undefined) => () => {
    // OLD 캡처는 이미 끝났고 화면은 frozen 스냅샷이 덮고 있다 — DOM 교체 전에 원복.
    restoreClamp();
    return typeof update === 'function' ? update() : undefined;
  };
  if (rawArg == null || typeof rawArg === 'function') {
    return [wrapUpdate(rawArg), ...args.slice(1)];
  }
  return [{ ...rawArg, update: wrapUpdate(rawArg.update) }, ...args.slice(1)];
}

/**
 * 진행 중인 View Transition 의 pseudo(`::view-transition*`) 애니메이션을 강제 완료시킨다.
 *
 * `skipTransition()` 이 조용히 실패하는 환경(iOS WKWebView 실증)에서 hung 전환을 회수하는
 * 안전한 경로: 전환은 자신의 pseudo 애니메이션이 모두 끝나야 finished 로 진행하므로,
 * `finish()`(무한 duration 등으로 불가하면 `cancel()`) 로 애니메이션을 끝내면 브라우저가
 * 오버레이·스냅샷을 정상 종료 루트로 스스로 정리한다. WebKit 실측: hung 전환이 이 방법으로
 * finished settle + 오버레이 제거되고 후속 전환도 정상 생성된다.
 */
function forceFinishViewTransitionAnimations(): void {
  if (typeof document.getAnimations !== 'function') return;
  for (const animation of document.getAnimations()) {
    const pseudo = (animation.effect as { pseudoElement?: string | null } | null)?.pseudoElement;
    if (typeof pseudo !== 'string' || !pseudo.startsWith('::view-transition')) continue;
    try {
      animation.finish();
    } catch {
      // finish 불가(무한 duration 등) — cancel 로도 애니메이션이 제거되어 전환은 종료로 진행한다.
      animation.cancel();
    }
  }
}

/**
 * `.app-vt-in-flight` 입력 락 백스톱 타임아웃(ms). 전환 애니메이션은 ~350ms 라 평상시엔
 * 항상 `transition.finished` 가 먼저 락을 푼다. 브라우저 버그 등으로 `finished` 가 영영
 * settle 되지 않아도 `:root.app-vt-in-flight { pointer-events:none }` 가 전체 페이지에
 * 영구히 걸려 앱이 멈추는 것을 막는 안전선. NEW 스냅샷 준비(`ready`)조차 오지 않는
 * (렌더가 끝내 commit 안 되는) 극단 케이스 전용 — 일반적인 hung 은 아래 `ready` 기반
 * 빠른 해제가 먼저 처리한다.
 */
const VT_LOCK_SAFETY_TIMEOUT_MS = 2000;

/**
 * `ready` 기반 빠른 해제 타임아웃(ms). `transition.ready` 가 resolve 되면 NEW 페이지가 이미
 * commit·캡처된 상태라 애니메이션은 길어야 ~350ms(view-transitions.css 의 push/pop) 안에 끝난다.
 * 그 뒤에도 `finished` 가 settle 되지 않으면(WebView/WKWebView 에서 무거운 페이지로의 VT 가
 * 간헐적으로 hung) 멈춘 `::view-transition` 오버레이가 남아 "스크롤만 되고 탭이 막히는" 현상이
 * 생긴다. `ready` 이후 이 시간이 지나면 `skipTransition()` 으로 오버레이를 제거해 입력을 복구한다.
 * 값 규칙: **애니메이션 최대치 + 200ms**. 애니메이션 길이를 바꾸면 이 값도 같이 옮긴다
 * (현재 push/pop 350ms → 550ms). 정상 전환은 `finished` 가 먼저 와서 이 타이머를 해제하므로
 * 애니메이션에는 영향이 없다.
 */
const VT_READY_RELEASE_MS = 550;

/**
 * in-flight 락 세대 카운터. 전환이 겹칠 때(직전 전환이 skip 되고 새 전환이 시작) 옛 전환의
 * cleanup 이 새 전환의 락을 덮어 풀어버리지 않도록, 자기 세대일 때만 정리한다.
 */
let vtLockGeneration = 0;

/**
 * 사용자 상호작용(=실제 네비게이션) 발생 여부. 첫 pointerdown/keydown/touchstart 에 true.
 *
 * Why: 새로고침/초기 진입 시 React `<ViewTransition>` 가 `<Suspense>` 공개를 enter 로 잡아
 * `document.startViewTransition` 을 자동 호출한다. 이 "진입 전환"은 (a) 페이지가 슬라이드/페이드되어
 * 들어오는 게 부자연스럽고, (b) named group(page-shell) 스냅샷이 root 스냅샷 위에 합성되면서
 * `#next-app-portal` 의 메인 팝업을 전환 시간 동안 덮어 "팝업이 떴다 사라졌다 다시뜨는" 깜빡임을
 * 유발한다 (팝업 React state 는 그대로 — 순수 시각 현상). 새로고침엔 전환이 없어야 정상이므로,
 * 사용자가 네비게이션(Link 클릭/뒤로가기 등)을 하기 전까지의 자동 VT 는 애니메이션을 스킵한다.
 * 모든 네비게이션 전환은 pointer/key 입력 뒤에 일어나므로 이 게이트로 정상 전환은 보존된다.
 */
let userHasInteracted = false;
function markUserInteracted(): void {
  userHasInteracted = true;
}
if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(type, markUserInteracted, { capture: true, passive: true });
  }
}

/**
 * View Transition 시작/종료 시점에 `<html>` 을 후킹한다. push/pop/popstate 모든 경로의
 * 전환이 `document.startViewTransition` 한 곳을 통과하므로 여기 한 번에서 다음을 처리한다:
 *
 * 1. **스크롤 오프셋 (`--app-vt-old-shift`)**
 *    `page-shell` view-transition-name 은 페이지 콘텐츠 전체 높이를 갖는 div 에 붙어 있다.
 *    스크롤이 내려간 상태에서 navigation 하면 `::view-transition-group(page-shell)` 가
 *    NEW 페이지 기준(top:0)으로 즉시 스냅되며, OLD 스냅샷이 최상단으로 끌어올려져
 *    "스크롤이 풀린 채" 옆으로 넘어가는 부자연스러운 전환이 발생한다. startViewTransition
 *    호출 시점(=OLD 캡처 직전, 같은 프레임이라 스크롤 값이 변하지 않는다)의 window.scrollY 를
 *    음수 px 로 기록 → view-transitions.css 의 OLD 키프레임이 translateY 로 보정.
 *
 * 2. **입력 락 (`.app-vt-in-flight`)**
 *    전환이 진행되는 동안 `<html>` 에 클래스를 부여 → CSS 가 `pointer-events: none` 으로 입력 차단.
 *    네이티브 NavigationController 와 동일하게 애니메이션 도중 추가 네비게이션이 끼어들지 않게 한다.
 *    이 락이 없으면 (a) push 도중 다른 Link 클릭 시 React 가 새 transition 으로 직전 transition 을
 *    skip 시켜 화면이 끊기고, (b) popstate 인수 도중 forward push 가 발생하면 우리가 다루고 있던
 *    SVT 가 reject 되어 `popstate-view-transition` 의 큐/페닝 상태가 꼬인다.
 *    `prefers-reduced-motion` 환경은 transition 자체가 0.01ms 라 락도 같이 즉시 풀린다.
 */
function patchStartViewTransition(): void {
  if (typeof document === 'undefined') return;

  type PatchableDocument = Document & {
    startViewTransition?: ((...args: unknown[]) => { finished?: Promise<unknown> }) & {
      __appVtPatched?: boolean;
    };
  };

  const doc = document as PatchableDocument;
  const original = doc.startViewTransition;
  if (typeof original !== 'function' || original.__appVtPatched) return;

  const patched = function patchedStartViewTransition(this: Document, ...args: unknown[]) {
    // 사용자 네비게이션 전(초기 로드/Suspense 공개)의 자동 전환은 진짜 전환을 만들지 않고
    // DOM 교체만 수행한다. updateCallback(DOM 교체)은 그대로 실행되므로 화면은 즉시 최종
    // 상태가 되고, page-shell 스냅샷이 메인 팝업을 덮는 깜빡임이 사라진다. 진짜 네비게이션
    // 전환은 입력 뒤라 영향 없음.
    if (!userHasInteracted) {
      // 진짜 전환을 시작하지 않고 updateCallback(DOM 교체)만 실행한다. skipTransition() 을 쓰면
      // ready/finished 가 AbortError("Transition was skipped") 로 reject 되어 (React 가 만든 파생
      // 프로미스까지) uncaught 로 새므로, 아예 전환을 만들지 않아 에러 자체를 없앤다. 화면은
      // updateCallback 으로 즉시 최종 상태가 되고 애니메이션만 생략된다.
      const arg = args[0] as undefined | (() => unknown) | { update?: () => unknown };
      const update = typeof arg === 'function' ? arg : arg?.update;
      let updateCallbackDone: Promise<unknown>;
      try {
        updateCallbackDone = Promise.resolve(typeof update === 'function' ? update() : undefined);
      } catch (error) {
        updateCallbackDone = Promise.reject(error);
      }
      const settled = updateCallbackDone.then(
        () => undefined,
        () => undefined
      );
      return {
        ready: settled,
        finished: settled,
        updateCallbackDone,
        skipTransition: () => {},
      } as unknown as ReturnType<NonNullable<PatchableDocument['startViewTransition']>>;
    }

    const root = document.documentElement;
    const generation = ++vtLockGeneration;
    // 직전 hung 전환의 오버레이 킬스위치 해제 — 새 전환의 스냅샷이 숨겨지지 않게 시작 전에 복구.
    root.classList.remove('app-vt-overlay-killed');

    // OLD 스냅샷 뷰포트 클램프. 성공 시 캡처물이 이미 "보던 화면"이라 스크롤 보정이 필요 없고
    // (shift 0px), 실패(셸 없음/짧은 페이지) 시 기존 전체-높이 스냅샷 + translateY 보정 경로.
    const restoreShellClamp = clampShellForOldCapture();
    lastOldCaptureClamped = restoreShellClamp != null;
    root.style.setProperty('--app-vt-old-shift', restoreShellClamp ? '0px' : `${-Math.round(window.scrollY)}px`);
    root.classList.add('app-vt-in-flight');

    // 흔적 제거 — 다음 렌더에 잔존 값이 새지 않도록. 클램프 원복은 update 콜백이 정상 실행되면
    // 이미 끝나 있고(멱등), update 가 영영 안 도는 극단 hung 에서만 여기서 실제로 되돌린다.
    // 락 클래스는 더 새로운 전환이 다시 잡았으면 (generation 갱신) 건드리지 않는다.
    const cleanup = () => {
      restoreShellClamp?.();
      if (generation !== vtLockGeneration) return;
      root.style.removeProperty('--app-vt-old-shift');
      root.classList.remove('app-vt-in-flight');
    };

    // 전환 객체를 백스톱에서 참조해야 하므로 먼저 생성한다. original 이 throw 하면 클래스만
    // 남고 백스톱도 없어 영구 락이 되므로 catch 에서 즉시 정리 후 rethrow.
    let transition: { finished?: Promise<unknown>; ready?: Promise<unknown>; skipTransition?: () => void } | undefined;
    try {
      const callArgs = restoreShellClamp ? injectClampRestoreIntoArgs(args, restoreShellClamp) : args;
      transition = original.apply(this, callArgs) as typeof transition;
    } catch (error) {
      cleanup();
      throw error;
    }

    // 멈춘 VT 강제 종료 + 정리. 단순히 클래스만 떼면 브라우저가 만든 ::view-transition 오버레이
    // (멈춘 VT 의 비-인터랙티브 스냅샷)가 남아 스크롤만 되고 탭이 전부 막히는 현상이 지속된다
    // (영구 락). skipTransition() 으로 VT 자체를 강제 종료해 오버레이까지 제거 → 입력 복구.
    const forceEnd = () => {
      try {
        transition?.skipTransition?.();
      } catch {
        // skipTransition 미지원/실패는 무시 — 아래 강제 완료·cleanup 이 회수를 이어받는다.
      }
      // iOS WKWebView 에서 skipTransition() 이 조용히 실패해 전환이 계속 살아남는 케이스 방어.
      // hung 전환은 오버레이+스냅샷 레이어가 영구 잔존해 반복 시 스냅샷이 누적돼 OOM 으로
      // 이어지고, React 도 finished 를 기다리느라 후속 전환을 만들지 못한다. VT pseudo
      // 애니메이션을 강제 완료시켜 전환을 "정상 종료" 경로로 회수한다.
      forceFinishViewTransitionAnimations();
      // 그래도 오버레이 페인트가 남는 최후 케이스용 CSS 킬스위치 — 다음 전환 시작 시 해제된다.
      // (visibility 기반. display:none 은 live 전환의 pseudo tree 를 강제 해체하다 WebKit 을
      // 크래시시키는 것이 실측 확인돼 금지 — view-transitions.css 킬스위치 규칙 참조.)
      root.classList.add('app-vt-overlay-killed');
      cleanup();
    };

    // 백스톱: NEW 스냅샷 준비(`ready`)조차 오지 않는 극단 hung 대비 최종 안전선.
    const safety = window.setTimeout(forceEnd, VT_LOCK_SAFETY_TIMEOUT_MS);

    // ready 기반 빠른 해제: NEW 페이지 commit·캡처가 끝나면(ready) 애니메이션은 ~350ms 안에
    // 끝나므로, 그 뒤 VT_READY_RELEASE_MS 가 지나도 finished 가 안 오면(WebView hung) 오버레이를
    // 강제 제거해 입력을 복구한다. 정상 전환은 finished 가 먼저 와 타이머를 모두 해제하므로
    // 애니메이션은 그대로 재생된다.
    let readyTimer = 0;
    Promise.resolve(transition?.ready)
      .then(() => {
        if (generation !== vtLockGeneration) return;
        readyTimer = window.setTimeout(forceEnd, VT_READY_RELEASE_MS);
      })
      .catch(() => {
        // ready reject(전환 스킵 등)는 finished/백스톱 경로가 처리.
      });

    // 전환 종료(성공/스킵/실패) 시점에 정리 + 모든 타이머 해제.
    transition?.finished?.finally(() => {
      window.clearTimeout(safety);
      window.clearTimeout(readyTimer);
      cleanup();
      // 좀비 오버레이 방어: iOS WKWebView 에서 finished 가 정상 settle 됐는데도 ::view-transition
      // 오버레이 페인트만 남는 케이스가 있다 (입력 락은 풀려 클릭은 통과되는데 스냅샷 그림이
      // 화면을 영구히 덮는 증상). 스펙상 finished 시점엔 오버레이가 이미 제거된 상태라 정상
      // 경로에선 no-op 이고, 잔류 시에만 확정 숨김이 된다. 더 새로운 전환이 이미 시작됐으면
      // (generation 갱신 + 시작 시점에 클래스 해제됨) 그 전환의 오버레이를 가리지 않도록
      // 자기 세대일 때만 부여한다.
      if (generation === vtLockGeneration) {
        root.classList.add('app-vt-overlay-killed');
      }
    });
    return transition;
  } as PatchableDocument['startViewTransition'];

  patched!.__appVtPatched = true;
  doc.startViewTransition = patched;
}

// 'use client' 모듈이라 클라이언트에서만 실행된다. navigation 발생 전(모듈 import 시점)에
// 패치를 설치해 첫 전환부터 보정이 적용되도록 한다.
patchStartViewTransition();

type Props = PropsWithChildren<{
  /**
   * `<ViewTransition>` 에 부여될 group name. transition snapshot 단위가 되며 동일 이름의
   * `::view-transition-group(...)` CSS 셀렉터와 짝을 이룬다.
   *
   * 기본값 `'page-shell'` 은 `@/styles/view-transitions.css` 에 정의된 셀렉터와 일치한다.
   * 별도 셀렉터를 쓰고 싶으면 동일 이름을 넘기고 자체 CSS 를 작성.
   */
  name?: string;
}>;

/**
 * Next 16 + React canary `<ViewTransition>` wrapper.
 *
 * Link · useRouter 가 주입한 `transitionTypes` 가 navigation 시 React transition 으로
 * 전달되고, 이 wrapper 가 트리에 있으면 React 가 commit 시점에 `document.startViewTransition`
 * 을 자동 호출해 `::view-transition-old(.nav-*)` / `::view-transition-new(.nav-*)` 클래스
 * 셀렉터로 정의된 슬라이드 애니메이션이 실행된다.
 *
 * **SSR·CSR 모두 동일하게 `<ViewTransition>` 로 감싼다 — hydration 게이트(useHydrated)를 두지 않는다.**
 * React 의 `<ViewTransition>` 은 DOM 을 추가하지 않는 logical fiber 라 SSR/hydration 출력이 children
 * 그대로로 일치한다(실측: hydration mismatch 없음). 과거엔 `useHydrated` 로 hydration 전엔 fragment,
 * 후엔 ViewTransition 으로 "승격"했는데, 이때 page-shell 의 자식 wrapper 타입이
 * Fragment → ViewTransition 으로 바뀌며 React 가 children(=페이지 전체)을 통째로 unmount→remount 했다.
 * 그 결과 모든 라우트 진입이 마운트 2회가 되어 화면이 두 번 깜빡이는 리프레시 현상이 발생했다.
 * wrapper 타입을 처음부터 고정해 이 remount 를 제거한다.
 *
 * 런타임에 `React.ViewTransition` 이 없으면 그냥 children fragment 로 fallback (이 경우는 SSR/CSR 모두
 * fragment 라 타입이 고정되므로 동일하게 remount 가 없다).
 */
export function PageViewTransition({ children, name = DEFAULT_PAGE_VIEW_TRANSITION_NAME }: Readonly<Props>) {
  if (!REACT_VIEW_TRANSITION) {
    return <>{children}</>;
  }
  return createElement(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    REACT_VIEW_TRANSITION as any,
    {
      enter: ENTER_EXIT_MAP,
      exit: ENTER_EXIT_MAP,
      // 페이지 children 교체는 (name 이 안정된 boundary 라) update 로 분류된다 — update 미지정 시
      // 기본 'auto' 가 타입 없는 내비게이션(같은 경로 쿼리 변경 등)까지 크로스페이드로 돌린다.
      update: ENTER_EXIT_MAP,
      // 명시적 name 으로 해당 group pseudo 만 잡아 CSS overflow:clip 등 컨테이너 한정 스타일이 매칭되게 한다.
      name,
    },
    children
  );
}
