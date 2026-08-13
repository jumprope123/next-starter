/**
 * 앱이 "이 라우트 쌍 사이의 이동에서는 view transition 을 끄거나(fade 로) 바꾼다" 는 규칙을
 * transition 엔진에 알려주는 단방향 DI 슬롯.
 * (`modal-route-bridge.ts` 와 같은 패턴 — 단, 단일 path 가 아니라 출발/도착 **쌍**을 본다.)
 *
 * 동기
 * - `modal-route-bridge` 는 "출발/도착 중 한쪽이라도 modal 이면 끈다" 는 단일 path 판정이라,
 *   특정 두 라우트 **사이**의 이동에서만 전환을 조정하고 싶은 경우를 표현할 수 없다. 예: 같은
 *   화면의 리스트/지도 토글은 둘 사이를 오갈 때만 슬라이드 대신 crossfade 를 쓰고, 바깥의 다른
 *   페이지에서 건너올 때는 정상 슬라이드를 유지해야 한다.
 * - 어떤 쌍을 조정할지는 앱별로 다르므로 앱이 부트 시점에 매처를 등록한다
 *   (`transition-suppressed-routes.ts`).
 *
 * 모드
 * - `'none'` (또는 `true`): 전환을 완전히 끈다 — Link/router 는 transition 미적용, popstate 는
 *   인수 skip (하드컷).
 * - `'fade'`: 방향 슬라이드 대신 crossfade(`nav-fade`) — Link/router 는 `['nav-fade']` 주입,
 *   popstate 도 `nav-fade` 로 인수한다.
 *
 * 미등록 상태에서는 항상 null (억제 없음) → 기존 동작 그대로.
 */

export type TransitionSuppressionMode = 'none' | 'fade';

/** `true` 는 `'none'` 과 동일 (하드컷). `false`/`null` 은 억제 없음. */
export type TransitionSuppressor = (
  currentNormalizedPath: string,
  targetNormalizedPath: string
) => boolean | TransitionSuppressionMode | null;

let registered: TransitionSuppressor | null = null;

/**
 * transition 억제/조정 판정 함수를 등록한다. 인자로는 `normalizePath` 가 적용된 출발/도착 path 가
 * 넘어온다 (locale prefix 제거, 쿼리/해시 제거, trailing slash 정리).
 *
 * 여러 번 호출하면 마지막 등록이 이긴다. 등록 해제가 필요하면 `null` 을 등록한다.
 */
export function registerTransitionSuppressor(matcher: TransitionSuppressor | null): void {
  registered = matcher;
}

/** 억제 모드 조회 — `'none'`(전환 없음) / `'fade'`(crossfade) / `null`(억제 없음). */
export function getTransitionSuppression(
  currentNormalizedPath: string,
  targetNormalizedPath: string
): TransitionSuppressionMode | null {
  const result = registered?.(currentNormalizedPath, targetNormalizedPath) ?? null;
  if (result === true || result === 'none') return 'none';
  if (result === 'fade') return 'fade';
  return null;
}
