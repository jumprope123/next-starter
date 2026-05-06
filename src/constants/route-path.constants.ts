/**
 * 앱 내부 경로를 한 곳에 모은다.
 *
 * 페이지 / Server Action / 미들웨어가 동일한 경로 문자열을 반복하지 않도록, 라우트는
 * 항상 이 객체를 통해 참조한다. 새 페이지가 생기면 여기에 키를 추가한다.
 *
 * locale prefix 는 `@/i18n/navigation` / `@/i18n/server-navigation` 가 자동으로 붙여 주므로,
 * 이 상수에는 prefix 없는 절대 경로만 둔다.
 */
export const ROUTE_PATHS = {
  HOME: '/',
} as const;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
