import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  // 라우트 보존(<Activity>) + 정적 셸 모델. 규칙·원리·함정은 docs/cache-components-guide.md.
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    scrollRestoration: true,
    // GET 핸들러의 try/catch 가 프리렌더 이탈 예외를 잡아 찍는 로그를 빌드 출력에서 숨긴다.
    hideLogsAfterAbort: true,
    // 서버 렌더를 완전 동적으로 두는 정책이라, dev 의 instant 검증은 `instant` 를 명시한 세그먼트에만 건다.
    // 기본값('warning')은 루트 layout 의 `instant = false` 와 무관하게 모든 page 를 검증해,
    // Suspense 밖에서 캐시 없는 fetch·`connection()` 을 쓰는 page 마다 dev 오류를 띄운다.
    instantInsights: { validationLevel: 'manual-warning' },
  },
  reactCompiler: true,
  poweredByHeader: false,
  turbopack: {
    /**
     * 상위 디렉터리에 다른 lockfile 이 있어도 Turbopack 이 잘못된 루트를 추론하지 않도록 명시한다.
     * (모노레포가 아니라 평범한 단일 앱일 때, 이 설정 한 줄로 빌드 워닝이 사라진다.)
     */
    root: projectRoot,
  },
  images: {
    formats: ['image/avif', 'image/webp'] as const,
    qualities: [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  rewrites: async () => {
    if (!process.env.APP_API_BASE_URL || !process.env.APP_IMAGE_BASE_URL) {
      return [];
    }

    return [
      {
        source: '/proxy/app/:path*',
        destination: `${process.env.APP_API_BASE_URL}/:path*`,
      },
      {
        source: '/proxy/data/:path*',
        destination: `${process.env.APP_IMAGE_BASE_URL}/data/:path*`,
      },
      {
        source: '/proxy/image/:path*',
        destination: `${process.env.APP_API_BASE_URL}/image/:path*`,
      },
    ];
  },
} satisfies import('next').NextConfig;

export default withNextIntl(nextConfig);
