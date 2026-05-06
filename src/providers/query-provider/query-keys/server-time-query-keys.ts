import { createQueryKeys } from '@lukemorales/query-key-factory';
import { getServerTime } from '@/actions';

/**
 * 서버 시간 도메인 쿼리 키 팩토리.
 *
 * `useServerNow` 훅이 `queries.serverTime.now()` 로 사용한다.
 */
export const serverTime = createQueryKeys('serverTime', {
  now: () => ({
    queryKey: ['now'],
    queryFn: getServerTime,
  }),
});
