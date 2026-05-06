/* eslint-disable @typescript-eslint/no-explicit-any */

import queryString from 'query-string';

/**
 * URL 쿼리스트링 값이 의미 있는 값인지 검사한다.
 *
 * `undefined` / `null` / 문자열 `'undefined'` / 문자열 `'null'` / 빈 값을 모두
 * "유효하지 않음"으로 처리한다. 쿼리스트링은 항상 문자열로 직렬화되기 때문에
 * 실제 `null` 과 문자열 `'null'` 을 모두 걸러야 하는 경우 사용한다.
 *
 * @param value 검사할 쿼리 값
 * @returns 유효한 값이면 `true`
 */
export const isValidQuery = (value: any): boolean =>
  value !== undefined && value !== null && value !== 'undefined' && value !== 'null' && value.length > 0;

/**
 * 단일/다중 값 쿼리에 특정 값이 포함되어 있는지 확인한다.
 *
 * 동일 키에 여러 값이 들어와 `string[]` 으로 파싱된 경우와 단일 `string` 인 경우를
 * 모두 처리한다. 단일 문자열 비교는 느슨한 동등성(`==`)을 사용한다.
 *
 * @param query 현재 쿼리 값 (단일/배열/undefined)
 * @param value 포함 여부를 확인할 값
 */
export const isIncludedInQuery = (query: string | string[] | undefined, value: string): boolean => {
  if (Array.isArray(query)) {
    return query.includes(value);
  }
  if (query) {
    return query == value;
  }
  return false;
};

/**
 * 기존 쿼리 값에 새로운 값을 추가한다.
 *
 * - 기존 값이 배열이면 새 항목을 끝에 추가한다.
 * - 기존 값이 단일 문자열이면 두 값을 가진 배열로 승격한다.
 * - 기존 값이 없으면 새 값 자체를 반환한다.
 *
 * 결과 형태가 단일/배열로 변할 수 있으므로 호출 측에서 두 형태를 모두 처리해야 한다.
 *
 * @param prevValue 기존 쿼리 값
 * @param newValue 추가할 값
 */
export const addToQuery = (prevValue: string | string[] | undefined, newValue: string): string | string[] => {
  if (Array.isArray(prevValue)) {
    return [...prevValue, newValue];
  }
  if (prevValue) {
    return [prevValue, newValue];
  }
  return newValue;
};

/**
 * 쿼리에서 특정 값을 제거한다.
 *
 * - 배열이면 일치하는 항목을 모두 걸러 낸 새 배열을 반환한다.
 * - 단일 값이고 일치하면 `undefined`, 불일치하면 그대로 반환한다.
 * - 값이 없으면 `undefined`를 반환한다.
 *
 * @param query 현재 쿼리 값
 * @param value 제거할 값
 */
export const removeFromQuery = (query: string | string[] | undefined, value: string): string | string[] | undefined => {
  if (Array.isArray(query)) {
    return query.filter((v) => v !== value);
  }
  if (query) {
    return query === value ? undefined : query;
  }
  return undefined;
};

/**
 * pathname 과 쿼리 객체를 합쳐 `<Link href>` 등에 바로 사용할 수 있는 URL 문자열을 만든다.
 *
 * - 쿼리가 비어 있으면 pathname 만 반환한다.
 * - pathname 에 이미 `?`가 있으면 `&`로 연결하고, 그렇지 않으면 `?`로 시작한다.
 * - pathname 이 `&`로 끝나면 그 뒤에 그대로 붙인다.
 *
 * 쿼리 직렬화는 `query-string` 라이브러리를 사용한다.
 *
 * @param pathname 베이스 경로 (예: `/products`, `/products?type=new`)
 * @param query 직렬화할 쿼리 객체
 * @returns 최종 URL 문자열
 * @example
 * createHrefQuery({ pathname: '/list', query: { page: 2, q: 'foo' } });
 * // → '/list?page=2&q=foo'
 */
export const createHrefQuery = ({
  pathname,
  query = {},
}: {
  pathname: string;
  query?: Parameters<typeof queryString.stringify>[0];
}): string => {
  if (!Object.keys(query).length) return pathname;

  const stringifyQuery = queryString.stringify({ ...query });
  if (pathname.includes('?')) {
    if (pathname.endsWith('&')) {
      return `${pathname}${stringifyQuery}`;
    } else {
      return `${pathname}&${stringifyQuery}`;
    }
  } else {
    return `${pathname}?${stringifyQuery}`;
  }
};
