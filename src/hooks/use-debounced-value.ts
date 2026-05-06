'use client';

import { useEffect, useState } from 'react';

/**
 * 입력 값을 일정 시간(`delay` ms) 동안 업데이트가 멈출 때까지 기다렸다가 반영하는 훅.
 *
 * 검색어 인풋 / 필터 슬라이더처럼 빠르게 변경되는 값을 react-query / 네트워크 호출에 그대로 흘려
 * 보내면 부담이 크기 때문에, 이 훅으로 한 번 흡수한 뒤 디바운스된 값으로 호출하는 패턴을 쓴다.
 *
 * @param value 추적할 값
 * @param delay 대기 ms (기본 300)
 * @returns 마지막 변경 후 `delay` 만큼 안정적으로 머무른 값
 *
 * @example
 * const debouncedKeyword = useDebouncedValue(keyword, 400);
 * useQuery({ ...queries.search.byKeyword(debouncedKeyword), enabled: !!debouncedKeyword });
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
