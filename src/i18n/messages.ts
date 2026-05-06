import en from '@/messages/en.json';
import ko from '@/messages/ko.json';
import { defaultLocale, type Locale } from './routing';

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  ko,
  en,
};

export { defaultLocale, type Locale };

/**
 * 주어진 로케일의 메시지 카탈로그를 반환한다.
 *
 * 새 로케일을 추가할 때는 `src/messages/<locale>.json` 을 만들고 위 `messagesByLocale` 에 등록한다.
 * 키 누락 시 next-intl 의 기본 동작은 키 자체를 반환하므로, UI 가 영문 fallback 을 보여주려면
 * `useAppTranslation` / `getServerAppTranslation` 의 `fallback` 옵션을 활용한다.
 */
export const getAppMessages = (locale: Locale = defaultLocale) => {
  return messagesByLocale[locale];
};
