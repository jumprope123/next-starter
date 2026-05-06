'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { AppT, AppTranslationOptions } from './app-translation-types';

function isMissingResult(result: string, key: string): boolean {
  // 빈 문자열은 의도된 번역(예: 한국어 호칭 '님' / 단위 '장' 이 영어에는 없음) 일 수 있어 missing 으로 보지 않는다.
  return result === key || (typeof result === 'string' && result.endsWith('.' + key));
}

/**
 * 클라이언트용 번역 훅 — fallback 과 values 를 한 곳에서 받는다.
 *
 * `next-intl` 의 `useTranslations` 결과를 감싸 키가 비어 있을 때 `fallback` 을 돌려주고,
 * placeholder 치환은 `values` 로 그대로 흘려 보낸다.
 *
 * @example
 *   const t = useAppTranslation();
 *   <h1>{t('home.title', { fallback: '홈' })}</h1>
 *   <p>{t('home.greeting', { fallback: '안녕하세요, {name}', values: { name } })}</p>
 */
export function useAppTranslation(): AppT {
  const t = useTranslations();

  return useCallback(
    (key: string, options?: AppTranslationOptions): string => {
      const { fallback, values } = options ?? {};
      try {
        const result = values ? t(key, values) : t(key);
        if (fallback !== undefined && isMissingResult(result, key)) return fallback;
        return result;
      } catch {
        return fallback ?? key;
      }
    },
    [t]
  );
}
