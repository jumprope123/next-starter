'use client';

import { useMemo } from 'react';

import { useSearchParams } from 'next/navigation';
import { isValidQuery } from '@/utils';
import { ParsedUrlQuery } from '@/types';

/**
 * `useSearchParams` 가 반환하는 `URLSearchParams` 를 평탄한 객체(`ParsedUrlQuery`) 로 변환한다.
 *
 * 동일 키가 여러 번 등장하면 자동으로 배열로 누적한다 (`?tag=a&tag=b` → `{ tag: ['a', 'b'] }`).
 * 빈 문자열 값은 제외하며, 결과는 `useMemo` 로 메모이제이션 된다. 클라이언트 컴포넌트 전용.
 *
 * @returns 현재 URL 의 모든 쿼리를 담은 객체
 */
export function useAllSearchParams() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const obj: ParsedUrlQuery = {};
    searchParams?.forEach((value, key) => {
      if (value) {
        if (isValidQuery(obj[key])) {
          obj[key] = [...[obj[key] ?? []].flat(), value];
        } else {
          obj[key] = value;
        }
      }
    });
    return obj;
  }, [searchParams]);
}
