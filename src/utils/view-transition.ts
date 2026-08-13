/**
 * patchStartViewTransition(`@/core/view-transition` page-view-transition.tsx)이 전환 진행 동안
 * `<html>` 에 부여하는 입력 락 클래스. 전환 시작과 **동기로** 붙고, finished/백스톱 타이머가
 * 반드시 떼므로 "전환 진행 중" 의 신뢰 가능한 신호다.
 */
const VT_IN_FLIGHT_CLASS = 'app-vt-in-flight';

/**
 * 연속 전환(back 연타의 popstate leg drain 등)을 이어서 기다리는 최대 회차.
 * 네비게이션이 계속되는 비정상 상황에서 호출자가 영영 기아되지 않게 하는 안전핀.
 */
const MAX_WAIT_PASSES = 8;

const collectViewTransitionAnimations = (): Animation[] => {
  if (typeof document.getAnimations !== 'function') return [];
  return document.getAnimations().filter((animation) => {
    const effect = animation.effect;
    if (!effect) return false;
    const pseudo = (effect as unknown as { pseudoElement?: string | null }).pseudoElement;
    return typeof pseudo === 'string' && pseudo.startsWith('::view-transition');
  });
};

/** in-flight 락 클래스가 제거될 때까지 대기. hung 전환도 백스톱이 강제 해제하므로 종료가 보장된다. */
const waitInFlightClassRemoval = (root: Element): Promise<void> =>
  new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (root.classList.contains(VT_IN_FLIGHT_CLASS)) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  });

/**
 * 진행 중인 View Transition 이 모두 종료될 때까지 대기.
 *
 * Why: 페이지 진입 effect 가 modal/bottom-sheet 를 자동으로 여는 흐름에서, ViewTransition pseudo
 * snapshot (`::view-transition-old/new(...)`) 이 root 컨텐츠 위로 합성되기 때문에, 막 마운트된 dim
 * 위로 페이지 snapshot 이 잠시 비쳐 보인다. 자동 오픈 트리거를 본 helper 이후로 미루면 transition
 * 이 끝난 뒤에 dim 이 올라와 깔끔하게 표시된다.
 *
 * 판정은 두 신호를 함께 쓴다:
 * 1. `.app-vt-in-flight` 락 클래스 — `startViewTransition()` 호출과 동시에 붙는다. pseudo-element
 *    애니메이션은 update 콜백(Next RSC 커밋, 수백 ms)이 끝나 NEW 캡처가 준비된 뒤에야
 *    `getAnimations()` 에 나타나므로, "시작~ready 사이" 공백은 이 클래스로만 감지할 수 있다.
 *    (이 공백에서 즉시 resolve 되면 전환 도중 모달이 열려 스냅샷에 덮이는 깜빡임이 난다.)
 * 2. `::view-transition*` pseudo 애니메이션 — 락 패치가 없는 환경(스토리북 등) 폴백 + 재생 구간 대기.
 *
 * 한 회차가 끝나도 다음 leg(연속 back drain)가 곧장 시작될 수 있어 두 신호가 모두 조용해질 때까지
 * 루프한다. 진행 중인 transition 이 없거나 환경이 미지원이면 즉시 resolve.
 */
export async function waitForViewTransitionEnd(): Promise<void> {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  for (let pass = 0; pass < MAX_WAIT_PASSES; pass++) {
    if (root.classList.contains(VT_IN_FLIGHT_CLASS)) {
      await waitInFlightClassRemoval(root);
      continue;
    }

    const animations = collectViewTransitionAnimations();
    if (animations.length === 0) return;

    await Promise.allSettled(animations.map((animation) => animation.finished));
  }
}
