import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

/**
 * Next.js 의 `middleware.ts` 를 대체하는 진입점.
 *
 * Next.js 16 부터 `proxy.ts` 가 권장되어 이름을 그대로 따랐다. 현재는 `next-intl` 의 미들웨어만
 * 통과시키지만, 인증 게이트나 A/B 테스트 같은 글로벌 사이드이펙트를 추가할 때 이 파일을 확장한다.
 *
 * `matcher` 에서 `proxy` 를 제외하지 않으면 `next.config.ts` 의 `/proxy/*` rewrite 가 미들웨어에 막혀
 * 백엔드로 전달되지 않으니 주의한다. 이미지 / 폰트 등 정적 자산도 동일한 이유로 제외돼 있다.
 */
const intlMiddleware = createIntlMiddleware(routing);

export default function proxy(request: unknown) {
  return intlMiddleware(request as Parameters<typeof intlMiddleware>[0]);
}

export const config = {
  matcher: [
    '/((?!api|proxy|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|woff|woff2|ttf|otf|ico|json)).*)',
  ],
};
