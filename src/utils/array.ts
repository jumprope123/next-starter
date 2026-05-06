/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Fisher–Yates 알고리즘으로 배열을 무작위로 섞는다.
 *
 * 입력 배열을 in-place 로 변형하며 새 배열을 반환하지 않는다. 원본을 보존해야 한다면
 * 호출 전에 복사본을 전달해야 한다.
 *
 * @param list 섞을 배열 (원본이 변형됨)
 * @example
 * const items = [1, 2, 3, 4];
 * shuffle(items); // items 자체가 무작위로 재배치된다
 */
export const shuffle = (list: any[]) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
};

/**
 * 배열을 지정한 크기의 청크로 분할한다.
 *
 * 마지막 청크는 `size`보다 작을 수 있다. 입력이 배열이 아니면 `ReferenceError`를 던진다.
 *
 * @param data 분할할 배열
 * @param size 각 청크의 최대 길이 (양의 정수)
 * @returns `size` 길이의 청크 배열들의 배열
 * @example
 * getChunkedArray({ data: [1, 2, 3, 4, 5], size: 2 });
 * // → [[1, 2], [3, 4], [5]]
 */
export const getChunkedArray = <T>({ data, size }: { data: T; size: number }): T[] => {
  if (!Array.isArray(data)) {
    throw ReferenceError('data is not array.');
  }

  const result: T[] = [];

  for (let i = 0; i < data.length; i += size) {
    const chunk = data.slice(i, i + size);
    result.push(chunk as T);
  }

  return result;
};

/**
 * 객체 배열에서 지정한 키 값이 동일한 항목 중 처음 등장한 것만 남긴다.
 *
 * 비교는 `Map`의 키 동등성(===)에 따라 수행된다. 등장 순서를 유지한다.
 *
 * @param items 중복 제거 대상 객체 배열
 * @param key 중복 판단의 기준이 되는 객체의 속성명
 * @returns 키 값이 유일한 항목만 포함된 새 배열
 * @example
 * filterDuplicateItem({
 *   items: [{ id: 1, name: 'a' }, { id: 1, name: 'b' }, { id: 2, name: 'c' }],
 *   key: 'id',
 * });
 * // → [{ id: 1, name: 'a' }, { id: 2, name: 'c' }]
 */
export const filterDuplicateItem = <T extends { [key: string]: unknown }>({
  items,
  key,
}: {
  items: T[];
  key: string;
}) => {
  const uniqueKeys = new Map();
  return items.filter((v) => !uniqueKeys.has(v[key]) && uniqueKeys.set(v[key], true));
};

/**
 * `JSON.parse(JSON.stringify(...))`를 사용한 단순 깊은 복사를 수행한다.
 *
 * `Date`, `Map`, `Set`, 함수, `undefined`, 순환 참조 등 JSON 직렬화가 불가능한 값은
 * 손실되거나 예외가 발생할 수 있다. 일반 배열 데이터에만 사용한다.
 *
 * @param data 복사할 배열 (`null` / `undefined` 인 경우 빈 배열로 처리)
 * @returns 입력과 동일한 형태의 새 배열
 */
export const deepCopy = <T extends unknown[]>(data: T): T => JSON.parse(JSON.stringify(data ?? '[]'));
