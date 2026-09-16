import { getTranslations } from 'next-intl/server';
import { isMissingTranslation } from './app-translation-types';
import type { AppT, AppTranslationOptions } from './app-translation-types';

/**
 * 서버 컴포넌트 / Server Action 용 번역 함수 — `useAppTranslation` 과 동일한 API.
 *
 * @example
 *   const t = await getServerAppTranslation();
 *   return <h1>{t('home.title', { fallback: '홈' })}</h1>;
 */
export async function getServerAppTranslation(): Promise<AppT> {
  const t = await getTranslations();

  return function appT(key: string, options?: AppTranslationOptions): string {
    const { fallback, values } = options ?? {};
    try {
      const result = values ? t(key, values) : t(key);
      if (fallback !== undefined && isMissingTranslation(result, key)) return fallback;
      return result;
    } catch {
      return fallback ?? key;
    }
  };
}
