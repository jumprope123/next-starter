import { NextRequest, NextResponse } from 'next/server';

/**
 * App Router의 Route Handler를 CORS 허용 핸들러로 감싸 주는 고차 함수.
 *
 * - 요청에 `Origin` 헤더가 있으면 그 값을 그대로 반향(reflect)하고, 없으면 `*` 로 응답한다.
 * - `OPTIONS` 프리플라이트 요청은 본 핸들러를 호출하지 않고 즉시 204 로 응답한다.
 * - 그 외 메서드는 핸들러 실행 후 응답에 CORS 헤더를 추가한다.
 *
 * `Access-Control-Allow-Credentials: true` 는 **실제 Origin 을 반향할 때만** 켠다 —
 * 와일드카드(`*`) 와 함께 보내면 스펙 위반이라 브라우저가 응답을 통째로 거부한다.
 * Origin 을 그대로 반향하므로 사실상 모든 출처를 허용하는 정책이다. 인증이 필요한
 * 엔드포인트라면 호출 측에서 허용 Origin 화이트리스트를 먼저 검증해야 한다.
 *
 * @param fn 실제 요청을 처리할 비동기 핸들러
 * @returns CORS 처리가 적용된 새로운 핸들러
 * @example
 * // app/api/foo/route.ts
 * export const GET = allowCors(async (req) => NextResponse.json({ ok: true }));
 * export const OPTIONS = allowCors(async () => new NextResponse());
 */
const CORS_METHODS = 'GET,OPTIONS,PATCH,DELETE,POST,PUT';
const CORS_HEADERS =
  'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version';

export const allowCors = (fn: (req: NextRequest) => Promise<NextResponse>) => async (req: NextRequest) => {
  const requestOrigin = req.headers.get('origin');
  const allowOrigin = requestOrigin ?? '*';
  const allowCredentials = requestOrigin !== null;

  const applyCorsHeaders = (headers: Headers): void => {
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    if (allowCredentials) headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', CORS_METHODS);
    headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
    // Origin 마다 응답이 달라지므로 캐시가 다른 출처의 응답을 재사용하지 않게 한다.
    headers.append('Vary', 'Origin');
  };

  /** OPTIONS 프리플라이트 요청은 핸들러를 거치지 않고 즉시 처리 */
  if (req.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    applyCorsHeaders(preflight.headers);
    return preflight;
  }

  /** 실제 비즈니스 핸들러 실행 */
  const response = await fn(req);

  /** 응답에 CORS 헤더 부착 */
  applyCorsHeaders(response.headers);

  return response;
};
