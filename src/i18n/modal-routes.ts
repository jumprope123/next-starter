'use client';

/**
 * 이 앱의 modal route (parallel `@modal` + intercepting `(.)foo` 패턴) 들을
 * transition 엔진에 등록한다.
 *
 * 등록된 경로는:
 * - `navigation-link.ts` 의 `resolveTypes` 가 transition 자동 끄기 (page 슬라이드 미적용)
 * - `popstate-view-transition.tsx` 의 `onPopState` 가 popstate 인수 skip (back/forward 시 슬라이드 없음)
 *
 * 모듈 import 만으로 등록되도록 부트 시점 (`AppShellProviders` 가 import) 에 사이드이펙트로
 * 실행한다. SSR / 서버 빌드 단계에서도 모듈은 평가되지만 module-level 변수를 세팅할 뿐이라 무해하다.
 */

import { registerModalRouteMatcher } from './modal-route-bridge';

/**
 * normalizedPath (locale prefix 가 제거된 path) 가 intercepting modal route 인지 판정한다.
 * 프로젝트에 modal route 가 생기면 여기 패턴을 추가한다.
 *
 * @example
 * const MODAL_ROUTE_PATTERNS: readonly RegExp[] = [/^\/photo\/[^/]+\/viewer$/];
 */
const MODAL_ROUTE_PATTERNS: readonly RegExp[] = [];

registerModalRouteMatcher((path) => MODAL_ROUTE_PATTERNS.some((re) => re.test(path)));
