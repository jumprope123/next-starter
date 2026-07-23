import type { MetadataRoute } from 'next';
import { ROUTE_PATHS } from '@/constants';
import { defaultLocale, locales } from '@/i18n/routing';

/**
 * Sitemap 엔트리.
 *
 * `ROUTE_PATHS` 에 정의된 경로마다 모든 로케일 변형(`/`, `/en/...`) 을 출력한다.
 * `localePrefix: 'as-needed'` 정책상 기본 로케일은 prefix 없이 노출된다.
 *
 * 운영 도메인은 환경 변수 `NEXT_PUBLIC_SITE_URL` 로 받는다 — 미설정 시 `http://localhost:3000` 을 사용한다.
 * 새 프로젝트에서는 도메인 / 우선순위 / 동적 라우트(상품 상세 등) 를 추가한다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const now = new Date();

  return Object.values(ROUTE_PATHS).flatMap((path) =>
    locales.map((locale) => {
      const isDefault = locale === defaultLocale;
      const url = `${base}${isDefault ? '' : `/${locale}`}${path === '/' ? '' : path}`;
      return {
        url: url || base,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: path === '/' ? 1 : 0.7,
      } satisfies MetadataRoute.Sitemap[number];
    })
  );
}
