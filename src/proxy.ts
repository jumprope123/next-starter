import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { CookieName } from '@/constants';
import { routing } from '@/i18n/routing';

/**
 * Next.js 의 `middleware.ts` 를 대체하는 진입점.
 *
 * Next.js 16 부터 `proxy.ts` 가 권장되어 이름을 그대로 따랐다. next-intl 미들웨어와
 * 웹뷰 safe-area 게이트를 처리하며, 인증 게이트나 A/B 테스트 같은 글로벌 사이드이펙트를
 * 추가할 때 이 파일을 확장한다.
 *
 * `matcher` 에서 `proxy` 를 제외하지 않으면 `next.config.ts` 의 `/proxy/*` rewrite 가 미들웨어에 막혀
 * 백엔드로 전달되지 않으니 주의한다. 이미지 / 폰트 등 정적 자산도 동일한 이유로 제외돼 있다.
 */
const intlMiddleware = createIntlMiddleware(routing);

/**
 * 웹뷰 safe-area 게이트 파라미터 이름. 네이티브가 첫 진입 URL 에 `?safearea=1`(또는 `=0`)
 * 으로 실어 보낸다. 미들웨어가 쿠키로 전환한 뒤 파라미터를 제거한 URL 로 redirect 한다.
 */
const SAFE_AREA_PARAM = 'safearea';

export default function proxy(request: NextRequest) {
  // safe-area 게이트: `?safearea` 파라미터가 있으면 쿠키로 전환하고 파라미터를 제거한 URL 로 redirect.
  // 미들웨어가 set 한 쿠키는 같은 요청의 RSC 렌더에서 읽히지 않으므로(응답에만 실림), redirect 해
  // 다음 요청의 layout 이 쿠키를 확실히 읽게 한다. 첫 진입 1회만 발생하고 URL 도 깨끗해진다.
  // layout 이 이 쿠키를 읽어 <html> 에 `.app-safe-area` 클래스를 SSR 주입한다.
  if (request.nextUrl.searchParams.has(SAFE_AREA_PARAM)) {
    const flag = request.nextUrl.searchParams.get(SAFE_AREA_PARAM);
    const enabled = flag !== '0' && flag !== 'false';
    const url = request.nextUrl.clone();
    url.searchParams.delete(SAFE_AREA_PARAM);
    const res = NextResponse.redirect(url);
    if (enabled) {
      res.cookies.set(CookieName.SAFE_AREA, '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        // 세션 쿠키면 앱 프로세스 종료 시 증발 → 푸시 딥링크 등 ?safearea=1 없는 콜드 스타트
        // 재진입에서 게이트가 꺼져 상단 요소가 상태바에 겹친다. 영속 쿠키로 유지한다.
        maxAge: 60 * 60 * 24 * 365,
      });
    } else {
      res.cookies.delete(CookieName.SAFE_AREA);
    }
    return res;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|proxy|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|woff|woff2|ttf|otf|ico|json)).*)',
  ],
};
