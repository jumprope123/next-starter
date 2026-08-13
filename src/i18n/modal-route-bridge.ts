/**
 * 앱이 자신의 "modal route" 패턴을 transition 엔진(`navigation-link.ts` /
 * `@/core/view-transition`)에 알려주는 단방향 DI 슬롯. (`back-stack-bridge.ts` 와 같은 패턴.)
 *
 * 동기
 * - parallel route + intercepting route (`@modal/(.)foo`) 로 띄우는 Portal modal 은 페이지
 *   콘텐츠를 갈아 끼우는 일반 라우트와 시각적으로 다른 전환을 기대한다 (모달은 즉시 떠야 한다).
 * - 그런데 `navigation-link.ts` / `popstate-view-transition.tsx` 는 단순히 path 비교로
 *   nav-forward/back 슬라이드를 적용하므로, 클릭으로 modal 을 열거나 브라우저 back/forward 로
 *   modal 라우트를 오갈 때 페이지 슬라이드가 부적절하게 끼어든다.
 * - 어떤 경로가 modal route 인지는 라우트 트리에 따라 다르므로 앱이 부트 시점에 매처를 등록한다
 *   (`modal-routes.ts`).
 *
 * 미등록 상태에서는 `isModalRoute` 가 false 만 반환 → 기존 동작 그대로.
 */

export type ModalRouteMatcher = (normalizedPath: string) => boolean;

let registered: ModalRouteMatcher | null = null;

/**
 * modal route 판정 함수를 등록한다. 인자로는 `normalizePath` 가 적용된 path 가 넘어온다
 * (locale prefix 제거, 쿼리/해시 제거, trailing slash 정리).
 *
 * 여러 번 호출하면 마지막 등록이 이긴다. 등록 해제가 필요하면 `null` 을 등록한다.
 */
export function registerModalRouteMatcher(matcher: ModalRouteMatcher | null): void {
  registered = matcher;
}

export function isModalRoute(normalizedPath: string): boolean {
  return registered?.(normalizedPath) ?? false;
}
