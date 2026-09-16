import { fetcher } from '@/core/fetch';

/** `/api/ping` 응답 스키마. 새 프로젝트에서는 자유롭게 교체한다. */
export type PingResponse = {
  code: number;
  message: string;
  data: {
    now: string;
    app: string;
  };
};

/**
 * `/api/ping` Route Handler 를 호출해 서버가 살아 있는지 확인하는 데모 호출.
 *
 * 새 백엔드 도메인을 붙일 때, 이 함수와 짝인 `commons.ping` 쿼리 키를 같은 패턴으로 추가하면 된다.
 */
export const getPing = async () => {
  const { data } = await fetcher<PingResponse>('/api/ping');
  // `fetcher` 는 본문이 없거나 JSON 이 아니면 null 을 준다 — 곧바로 프로퍼티에 접근하면 TypeError.
  if (!data) throw new Error('ping response is empty');
  if (data.code !== 200) throw new Error(data.message);
  return data.data;
};
