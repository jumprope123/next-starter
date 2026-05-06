import { NextRequest, NextResponse } from 'next/server';

/**
 * App Router의 Route Handler를 CORS 허용 핸들러로 감싸 주는 고차 함수.
 *
 * - 모든 Origin (`*`) 또는 요청 헤더의 `Origin` 값을 그대로 허용한다.
 * - `OPTIONS` 프리플라이트 요청은 본 핸들러를 호출하지 않고 즉시 200 으로 응답한다.
 * - 그 외 메서드는 핸들러 실행 후 응답에 CORS 헤더를 추가한다.
 *
 * 자격 증명을 포함한 요청을 허용하므로 (`Access-Control-Allow-Credentials: true`) 보안상
 * 필요한 경우 호출 측에서 Origin 검증 로직을 별도로 추가해야 한다.
 *
 * @param fn 실제 요청을 처리할 비동기 핸들러
 * @returns CORS 처리가 적용된 새로운 핸들러
 * @example
 * // app/api/foo/route.ts
 * export const GET = allowCors(async (req) => NextResponse.json({ ok: true }));
 * export const OPTIONS = allowCors(async () => new NextResponse());
 */
export const allowCors = (fn: (req: NextRequest) => Promise<NextResponse>) => async (req: NextRequest) => {
  const origin = req.headers.get('origin') || '*';

  /** OPTIONS 프리플라이트 요청은 핸들러를 거치지 않고 즉시 처리 */
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers':
          'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
      },
    });
  }

  /** 실제 비즈니스 핸들러 실행 */
  const response = await fn(req);

  /** 응답에 CORS 헤더 부착 */
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  return response;
};
