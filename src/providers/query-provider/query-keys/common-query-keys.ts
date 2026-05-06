import { createQueryKeys } from '@lukemorales/query-key-factory';
import { getPing } from '@/core';

/**
 * 도메인 분류가 애매한 공통 헬스체크/메타 호출용 쿼리 키.
 *
 * `getPing` 은 `/api/ping` Route Handler 를 호출해 서버가 살아 있는지를 확인한다.
 * 새 프로젝트에서 필요 없으면 `mergeQueryKeys` 인자에서만 빼면 호출 자체가 사라진다.
 */
export const commons = createQueryKeys('commons', {
  ping: () => ({
    queryKey: ['ping'],
    queryFn: getPing,
  }),
});
