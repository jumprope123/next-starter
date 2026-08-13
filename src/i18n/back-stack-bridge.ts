/**
 * `@/core/back-stack` 의 상태를 i18n router wrapper (`navigation-link.ts`) 가 조회할 수 있게
 * 해주는 단방향 DI 슬롯.
 *
 * 의존 방향 문제
 * - `@/core/back-stack` → `@/i18n` 방향의 import 만 허용한다. router wrapper 는 i18n 안에
 *   있으므로 back-stack 모듈을 직접 import 하면 순환이 생긴다.
 * - back-stack 모듈이 로드되는 시점(클라이언트 only, `'use client'`) 에 자기 자신의 헬퍼를
 *   여기에 등록하면, router wrapper 는 등록된 객체를 통해 sentinel 상태를 조회/제어할 수 있다.
 *
 * 사용 목적
 * - router.replace 가 호출된 시점에 BottomSheet/Dialog 가 쌓아둔 sentinel history entry 가
 *   있으면, 그 sentinel 부터 먼저 pop 한 뒤 replace 해야 "원래 페이지를 덮는" 진짜 replace 가
 *   된다. sentinel 위에서 replaceState 만 부르면 sentinel entry 만 덮여 사용자에겐 push 처럼
 *   보인다 (뒤로가기로 원래 페이지가 다시 등장).
 * - sentinel 을 pop 하기 위한 popstate 는 back-stack 의 `handlePopstate` (stale 흡수 분기) 가
 *   추가로 한 칸을 더 흡수해 버리지 않도록 `suppressNextPopstate` 로 표시해 둔다.
 *
 * 미등록 상태 (SSR / back-stack 미로드) 에서는 sentinel count 0 으로 동작 → 기존 경로 그대로.
 */

type BackStackBridge = {
  /** 현재 활성 sentinel(=BackStack 에 등록된 핸들러) 개수. */
  readonly getSentinelCount: () => number;
  /**
   * 다음 popstate 부터 count 개만큼 back-stack 의 `handlePopstate` 가 그대로 흡수하도록 표시.
   * router wrapper 가 sentinel 을 pop 하기 위해 `history.back()` 을 호출하기 직전에 사용한다.
   */
  readonly suppressNextPopstate: (count: number) => void;
};

let registered: BackStackBridge | null = null;

export function registerBackStackBridge(bridge: BackStackBridge): void {
  registered = bridge;
}

export function getActiveSentinelCount(): number {
  return registered?.getSentinelCount() ?? 0;
}

export function suppressActiveSentinelPops(count: number): void {
  if (count <= 0) return;
  registered?.suppressNextPopstate(count);
}
