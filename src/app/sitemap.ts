import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';
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
 *
 * `lastModified` 는 빌드(배포) 시각이다. Cache Components 에서 `new Date()` 를 그냥 부르면 빌드 때 굳지 않고
 * 요청마다 생성되므로(빌드 출력 `ƒ`), 시각을 `'use cache'` 헬퍼로 빼서 도입 전처럼 정적(`○`)으로 둔다
 * (docs/cache-components-guide.md §3-6).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const now = await getBuildTime();

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

async function getBuildTime() {
  'use cache';
  cacheLife('max');
  return new Date();
}
