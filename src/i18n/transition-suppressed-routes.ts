'use client';

/**
 * 이 앱에서 "두 라우트 사이를 오갈 때만 view transition 을 끄거나(fade 로) 바꾸는" 쌍들을
 * transition 엔진에 등록한다.
 *
 * 등록된 쌍은:
 * - `navigation-link.ts` 의 `resolveTypes` 가 Link / router.push·replace 의 transition 을
 *   모드에 맞게 조정 ('none' → 미적용, 'fade' → `['nav-fade']`)
 * - `popstate-view-transition.tsx` 가 back/forward popstate 를 'none' 이면 인수 skip(하드컷),
 *   'fade' 면 crossfade 로 인수
 *
 * modal-route 와 달리 **출발/도착이 모두** 쌍에 속할 때만 적용 — 바깥의 다른 페이지에서
 * 건너올 때는 정상 슬라이드를 유지한다.
 *
 * 모듈 import 만으로 등록되도록 부트 시점 (`AppShellProviders` 가 import) 에 사이드이펙트로
 * 실행한다. (modal-routes.ts 와 동일 패턴.)
 *
 * @example
 * // 같은 화면의 리스트 ↔ 지도 토글은 무전환:
 * const LIST_MAP_PAIR: readonly string[] = [ROUTE_PATHS.STORES, ROUTE_PATHS.STORES_MAP];
 * registerTransitionSuppressor((current, target) => {
 *   if (LIST_MAP_PAIR.includes(current) && LIST_MAP_PAIR.includes(target)) return 'none';
 *   return null;
 * });
 */

import { registerTransitionSuppressor } from './transition-suppressor-bridge';

// 억제할 쌍이 생기면 위 @example 처럼 매처를 구현한다. 기본은 억제 없음.
registerTransitionSuppressor(() => null);
