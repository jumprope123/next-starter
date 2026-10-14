import { connection, NextResponse } from 'next/server';

/**
 * 헬스체크 / 부트스트랩 시연용 Route Handler.
 *
 * `getPing` (`@/core/demo`) → `commons.ping` 쿼리 키 → `<TemplatePlayground />` 에서 호출한다.
 * 새 프로젝트에서는 자유롭게 교체하거나 제거한다.
 */
export async function GET() {
  // Cache Components 에서 요청 데이터를 안 읽는 GET 은 빌드 때 프리렌더된다 — 요청 시점 응답임을 못박는다.
  await connection();
  return NextResponse.json({
    code: 200,
    message: 'ok',
    data: {
      now: new Date().toISOString(),
      app: 'template-next-single',
    },
  });
}
