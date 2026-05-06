/**
 * URL 쿼리스트링을 객체 형태로 표현한 타입.
 *
 * - 동일 키가 여러 번 등장하면 `string[]` 으로 누적된다.
 * - 값이 비어 있으면 `undefined` 가 될 수 있다.
 *
 * `useAllSearchParams` / `useSearchQuery` / `query.ts` 의 헬퍼들이 모두 이 형태를 표준으로 사용한다.
 */
export type ParsedUrlQuery = { [key: string]: string | string[] | undefined };
