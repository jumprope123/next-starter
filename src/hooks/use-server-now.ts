'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queries } from '@/providers';

type Props = {
  autoUpdate?: boolean;
};

/**
 * 서버 시간을 기준으로 현재 시각(`now`)을 추적하는 Hook.
 *
 * - 서버에서 한 번 시간을 받아 클라이언트의 `Date.now()` 와의 오프셋을 계산한 뒤,
 *   매 초 `Date.now() + offset` 으로 `now` 를 갱신한다.
 * - 클라이언트의 시계가 잘못 설정되어 있어도 항상 서버 시간 기준으로 일관된 카운트다운/카운터를
 *   구현할 수 있다.
 * - `@tanstack/react-query` 의 `useQuery` 를 사용하며, 쿼리 키는 `queries.serverTime.now()` 로
 *   `@/providers/query-provider/query-keys/server-time-query-keys.ts` 에 정의되어 있다.
 *
 * @param props.autoUpdate `true` 면 1초 간격 자동 갱신, `false` 면 데이터 변경 시에만 한 번 갱신 (기본값 `true`)
 * @returns react-query 의 `data`, `isLoading`, `isFetching`, `refetch`, `error` 와 더불어 현재 서버 시간 `now` (epoch ms)
 */
export function useServerNow(props?: Props) {
  const { autoUpdate = true } = { ...props };
  const [now, setNow] = useState<number>();
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    ...queries.serverTime.now(),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data) return;

    /** 로컬 시간과 오차 계산 */
    const offset = data - Date.now();

    /** 현재 서버시간 계산 */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now() + offset);

    if (!autoUpdate) return;

    /** 매초마다 자동 갱신 */
    const timer = setInterval(() => {
      setNow(Date.now() + offset);
    }, 1000);

    return () => clearInterval(timer);
  }, [data, autoUpdate]);

  return { data, now, isLoading, isFetching, refetch, error };
}
