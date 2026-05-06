import 'server-only';
import { getLocale } from 'next-intl/server';
import { permanentRedirect as i18nPermanentRedirect, redirect as i18nRedirect } from './navigation';

type RedirectType = 'push' | 'replace';

/**
 * 서버에서 현재 locale 을 자동 주입해 호출하는 redirect 래퍼.
 *
 * `redirect(ROUTE_PATHS.X)` 패턴을 그대로 유지하기 위한 헬퍼이며, 반환 타입은 `never` 이다.
 * 클라이언트에서는 `@/i18n/navigation` 의 `redirect` 또는 `useRouter().push(...)` 를 사용한다.
 */
export async function redirect(href: string, type?: RedirectType): Promise<never> {
  const locale = await getLocale();
  return i18nRedirect({ href, locale }, type);
}

export async function permanentRedirect(href: string, type?: RedirectType): Promise<never> {
  const locale = await getLocale();
  return i18nPermanentRedirect({ href, locale }, type);
}
