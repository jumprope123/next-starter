import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { getAppMessages, type Locale } from './messages';
import { routing } from './routing';

/**
 * `next-intl/plugin` 이 호출하는 요청별 i18n 설정 로더.
 *
 * - `requestLocale` 이 `routing.locales` 에 포함되지 않으면 `defaultLocale` 로 폴백한다.
 * - 메시지 카탈로그는 `getAppMessages(locale)` 한 곳에서 관리한다 — JSON 을 직접 import 하지 않는다.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (hasLocale(routing.locales, requested) ? requested : routing.defaultLocale) as Locale;

  return {
    locale,
    messages: getAppMessages(locale),
  };
});
