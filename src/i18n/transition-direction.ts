import { ROUTE_PATHS } from '@/constants';
import { locales } from './routing';

/** ViewTransition 으로 매핑되는 navigation 방향 타입.
 *
 * - 단일 출처: 새 타입을 추가하면 `<PageViewTransition>` 의 enter/exit map 도 자동 확장되고,
 *   CSS 측 `::view-transition-old(.<name>)` 셀렉터만 더하면 동작한다.
 */
export const NAV_TRANSITION_TYPES = [
  'nav-forward',
  'nav-back',
  'nav-lateral-left',
  'nav-lateral-right',
  'nav-fade',
] as const;

export type NavTransitionType = (typeof NAV_TRANSITION_TYPES)[number];

const LOCALE_PREFIX_RE = new RegExp(`^/(?:${locales.join('|')})(?=/|$)`);

/** 홈 라우트로 간주하는 path 들. 홈 → 비홈은 push, 비홈 → 홈은 pop 으로 판정된다. */
const HOME_PATHS: readonly string[] = [ROUTE_PATHS.HOME];

function isHomePath(path: string): boolean {
  return HOME_PATHS.includes(path);
}

/**
 * 홈으로 "앞으로 가는" 플로우의 출발 경로 prefix.
 *
 * 로그인 / 회원가입 / SSO 인증 같은 진입 플로우는 완료 후 홈으로 이동하는 것이 곧 서비스 안으로
 * "들어가는" 동작이다. 일반적인 홈 이동(상위로 빠져나가는 nav-back)이 아니라 무전환이 어울리므로,
 * 출발 경로가 이 prefix 들에 속하면 transition 을 끈다. 프로젝트에 로그인/온보딩 플로우가 생기면
 * 해당 경로를 여기에 추가한다. (예: ROUTE_PATHS.SIGNIN, ROUTE_PATHS.SIGN_UP)
 */
const FORWARD_TO_HOME_PREFIXES: readonly string[] = [];

function isForwardToHomeSource(path: string): boolean {
  return FORWARD_TO_HOME_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * `/en/foo/bar` → `/foo/bar` 처럼 로케일 prefix 만 잘라낸 path 를 돌려준다.
 * 쿼리/해시도 제거해서 depth 비교가 path segment 만 보도록 한다.
 */
export function normalizePath(input: string | undefined | null): string {
  if (!input) return '/';
  const noQuery = input.split('?')[0]?.split('#')[0] ?? '/';
  const stripped = noQuery.replace(LOCALE_PREFIX_RE, '') || '/';
  if (stripped === '') return '/';
  return stripped.endsWith('/') && stripped !== '/' ? stripped.slice(0, -1) : stripped;
}

function segments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export type ComputeNavTransitionOptions = {
  /** 호출이 `router.replace` 인지 여부. 기본은 push (`Link` · `router.push`). */
  isReplace?: boolean;
};

/**
 * iOS 스타일 push/pop 판정.
 *
 * - target 이 current 의 prefix 면 pop (`/store/123` → `/store`)
 * - current 가 target 의 prefix 면 push (`/orders` → `/orders/cart`)
 * - 그 외에는 segment depth 로 비교 (depth ↑ = push). depth ↓ 는 pop 으로 판정하지 않는다 —
 *   prefix 관계가 아닌 한 (`/store/123/review` → `/review/report`) Link 이동은 히스토리 push 이므로
 *   forward 로 본다.
 * - depth >= 2 인 동일 depth 경로에서 마지막 segment 한 자리만 다름
 *   (`/market/123` ↔ `/market/456`) 은 같은 라우트의 dynamic 인스턴스 swap 이므로
 *   **replace 호출인 경우에만** transition 끄기 → undefined 반환. `router.push` / `<Link>`
 *   (히스토리 push) 로 이동하면 사용자 의도는 "다른 인스턴스 페이지로 들어가기" 이므로 일반
 *   forward 슬라이드를 적용한다.
 * - depth 동일 + prefix 무관 (`/my-page` ↔ `/signin` 등) 은 push 로 fallback
 *   → iOS 의 페이지 전환은 항상 슬라이드(push/pop)가 기본이고 fade 는 일반적이지 않다.
 *   nav-fade 가 필요한 경우엔 호출자가 `transitionTypes={['nav-fade']}` 로 명시.
 *
 * 홈 라우트(`/`) 특수 처리:
 * - 홈 → 비홈 은 push (forward).
 * - 비홈 → 홈 은 기본 pop (back) 이지만, 출발 경로가 로그인 / 회원가입 같은 진입 플로우
 *   (`FORWARD_TO_HOME_PREFIXES`) 면 "앞으로 들어가는" 동작이므로 무전환 처리한다.
 *
 * 같은 path 면 undefined 반환 → transition 미적용.
 */
export function computeNavTransitionType(
  currentRaw: string,
  targetRaw: string,
  options?: ComputeNavTransitionOptions
): NavTransitionType | undefined {
  const current = normalizePath(currentRaw);
  const target = normalizePath(targetRaw);

  if (current === target) return undefined;

  const currentIsHome = isHomePath(current);
  const targetIsHome = isHomePath(target);

  // 홈 → 비홈: 서비스 안으로 들어가는 push.
  if (currentIsHome) return 'nav-forward';

  // 비홈 → 홈: 기본은 상위로 빠져나가는 pop(nav-back).
  // 단, 로그인 / 회원가입 진입 플로우 완료 후 홈 이동은 "앱에 들어가는" 동작이라 슬라이드가
  // 불필요하다. 전환을 끄면(undefined) 진입이 즉각적이다.
  if (targetIsHome) {
    return isForwardToHomeSource(current) ? undefined : 'nav-back';
  }

  const cSegs = segments(current);
  const tSegs = segments(target);

  const cPrefixOfT = tSegs.length > cSegs.length && cSegs.every((s, i) => s === tSegs[i]);
  if (cPrefixOfT) return 'nav-forward';

  const tPrefixOfC = cSegs.length > tSegs.length && tSegs.every((s, i) => s === cSegs[i]);
  if (tPrefixOfC) return 'nav-back';

  if (tSegs.length > cSegs.length) return 'nav-forward';

  // depth 동일 + depth >= 2 + 앞쪽 segment 모두 같고 마지막 segment 만 다름 — 같은 라우트의
  // dynamic 값 swap 으로 본다 (예: /market/123 → /market/456). replace 호출에서는 슬라이드가
  // 어색하므로 transition off; push 호출은 아래 forward fallback 으로 흘려보낸다.
  if (options?.isReplace && cSegs.length >= 2) {
    const lastIdx = cSegs.length - 1;
    const leadingMatch = cSegs.slice(0, lastIdx).every((s, i) => s === tSegs[i]);
    if (leadingMatch && cSegs[lastIdx] !== tSegs[lastIdx]) return undefined;
  }

  // depth 동일 + 위 조건 미해당 (top-level 페이지 swap, 중간 segment 가 변경된 경우 등).
  // iOS 스타일에 맞게 push 로 통일.
  return 'nav-forward';
}

/** href 가 string | UrlObject 어떤 형태든 path 만 뽑아낸다.
 *
 * UrlObject 에서 pathname 도 href 도 명시되지 않은 경우 (예: `<Link href={{ query: { ... } }} />` 처럼
 * 같은 페이지에서 query/hash 만 갱신) 는 `fallback` 을 그대로 반환한다. 호출자가 currentPath 를
 * fallback 으로 넘기면 `computeNavTransitionType` 이 current === target 으로 보고 transition 을 끈다.
 */
export function extractHrefPath(href: unknown, fallback: string = '/'): string {
  if (typeof href === 'string') return href;
  if (href && typeof href === 'object') {
    const obj = href as { pathname?: string; href?: string };
    return obj.pathname ?? obj.href ?? fallback;
  }
  return fallback;
}
