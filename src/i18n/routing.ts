import { defineRouting } from 'next-intl/routing';

/**
 * 지원 로케일.
 * 기본 보일러플레이트는 한국어/영어만 켠다. 추가 로케일을 붙이려면 이 배열에 코드를 추가하고
 * `src/messages/<locale>.json` 카탈로그를 함께 만든다.
 */
export const locales = ['ko', 'en'] as const;
export type Locale = (typeof locales)[number];

/**
 * 기본 로케일.
 *
 * `localePrefix: 'as-needed'` 정책이라 기본 로케일은 prefix 없이 노출된다 (`/about`),
 * 나머지 로케일은 prefix 가 붙는다 (`/en/about`).
 */
export const defaultLocale: Locale = 'ko';

/** next-intl 라우팅 정책. localePrefix: 'as-needed' — 기본 로케일은 prefix 없이 노출. */
export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'as-needed',
});
