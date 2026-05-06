import type { MetadataRoute } from 'next';

/**
 * `robots.txt` 동적 생성.
 *
 * 운영 도메인(`NEXT_PUBLIC_SITE_URL`) 이 있으면 sitemap 절대 URL 을 함께 노출한다.
 * 기본은 모든 크롤러에게 모든 경로 허용 — 운영 정책에 맞춰 새 프로젝트에서 조정한다.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
