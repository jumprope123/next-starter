import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { getAppMessages, type Locale } from './messages';
import { routing } from './routing';

/**
 * `next-intl/plugin` 이 호출하는 요청별 i18n 설정 로더.
 *
 * - 로케일은 루트 param(`[locale]`)에서 읽는다 (`next/root-params`). Partial Prefetching 은 URL 데이터(`params`)를
 *   읽지 않는 page 의 출력을 모든 param 값이 공유하는데, next-intl 의 `requestLocale` 은 미들웨어가 넘긴 **헤더**로
 *   로케일을 얻어 URL 데이터로 취급되지 않는다 — 그대로 두면 언어 전환 링크로 이동했을 때 서버 번역 문구가
 *   이전 로케일 것으로 남는다 (docs/cache-components-guide.md §3-7).
 * - 루트 param getter 는 Server Action·Route Handler 에서 쓸 수 없어 그때만 `requestLocale` 로 폴백한다.
 * - 값이 `routing.locales` 에 없으면 `defaultLocale` 로 폴백한다.
 * - 메시지 카탈로그는 `getAppMessages(locale)` 한 곳에서 관리한다 — JSON 을 직접 import 하지 않는다.
 */
export default getRequestConfig(async ({ locale: explicitLocale, requestLocale }) => {
  let requested: string | undefined = explicitLocale;
  if (!requested) {
    try {
      requested = await rootParams.locale();
    } catch {
      requested = await requestLocale;
    }
  }
  const locale = (hasLocale(routing.locales, requested) ? requested : routing.defaultLocale) as Locale;

  return {
    locale,
    messages: getAppMessages(locale),
  };
});
