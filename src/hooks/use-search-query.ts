'use client';

import queryString from 'query-string';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useCallback } from 'react';
import { useAllSearchParams } from './use-all-search-params';
import { ParsedUrlQuery } from '@/types';

type UseSearchQuerySetOptions = {
  replace?: boolean;
};

type UseSearchQueryResultTuple<T> = [T, (query: Partial<T>, options?: UseSearchQuerySetOptions) => void, () => void];

type UseSearchQueryResultObject<T> = {
  query: T;
  setQuery: (query: Partial<T>, options?: UseSearchQuerySetOptions) => void;
  resetQuery: () => void;
};

type UseSearchQueryResult<T> = UseSearchQueryResultTuple<T> & UseSearchQueryResultObject<T>;

/**
 * URL 쿼리스트링을 읽고/쓰는 통합 Hook.
 *
 * - 현재 쿼리는 `useAllSearchParams` 의 결과를 그대로 사용한다 (배열 누적, 빈 값 제외 처리 포함).
 * - `setQuery` 는 기존 쿼리에 부분 업데이트를 머지한 뒤, falsy 한 값을 제거하고 URL 을 갱신한다.
 *   기본 동작은 `router.replace` 이며 `{ replace: false }` 로 호출하면 `router.push` 가 사용된다.
 *   두 경우 모두 `{ scroll: false }` 옵션이 적용되어 페이지 스크롤이 흔들리지 않는다.
 * - `resetQuery` 는 모든 쿼리를 제거한 pathname 으로 `replace` 한다.
 *
 * 라우터는 반드시 `@/i18n/navigation` 것을 쓴다 (`next/navigation` 직접 사용 금지).
 * locale prefix 자동 처리뿐 아니라, 열린 바텀시트/모달이 history 에 쌓아둔 back-stack sentinel 을
 * pop 한 뒤 replace 해 주기 때문이다 — raw 라우터로 replace 하면 sentinel entry 만 덮여
 * "필터 시트에서 쿼리를 바꾸고 닫았는데 뒤로가기가 한 번 더 필요한" 증상이 난다.
 *
 * 반환값은 객체 형태(`{ query, setQuery, resetQuery }`) 와 튜플 형태(`[query, setQuery, resetQuery]`)
 * 모두로 비구조화 할 수 있도록 합쳐진 객체이다.
 *
 * @example
 *   const [query, setQuery, resetQuery] = useSearchQuery<{ q?: string }>();
 *   const { query, setQuery, resetQuery } = useSearchQuery<{ q?: string }>();
 */
export function useSearchQuery<T extends ParsedUrlQuery>(): UseSearchQueryResult<T> {
  const router = useRouter();
  const pathname = usePathname();
  const queries = useAllSearchParams();

  const setQuery = useCallback(
    (query: Partial<T>, options?: UseSearchQuerySetOptions) => {
      const { replace = true } = { ...options };
      const mergedQuery = { ...queries, ...query };

      // falsy 한 값을 가진 key 삭제
      const filteredQuery = Object.fromEntries(Object.entries(mergedQuery).filter(([, value]) => Boolean(value)));

      const href = `${pathname}?${queryString.stringify(filteredQuery)}`;

      // 쿼리 업데이트
      if (replace) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
    },
    [pathname, queries, router]
  );

  const resetQuery = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const result = [queries as T, setQuery, resetQuery] as UseSearchQueryResult<T>;
  result.query = queries as T;
  result.setQuery = setQuery;
  result.resetQuery = resetQuery;

  return result;
}
