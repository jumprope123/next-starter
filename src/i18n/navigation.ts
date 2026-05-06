import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * locale 인식 navigation 헬퍼.
 *
 * `next/link` / `next/navigation` 의 `Link, redirect, useRouter, usePathname` 대신 항상 이 모듈에서 가져온다.
 * 호출 시 prefix 가 자동으로 붙고, `Link` 의 `locale` prop 으로 다른 언어로 이동할 수도 있다.
 *
 * 서버 컴포넌트 / Server Action 에서의 `redirect` 는 `@/i18n/server-navigation` 을 사용한다.
 */
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } = createNavigation(routing);
