declare namespace NodeJS {
  /**
   * `process.env` 에 노출되는 환경 변수 타입.
   *
   * 새 환경 변수를 추가할 때마다 이 인터페이스에 키를 등록하면 사용처에서 자동완성과 타입 안전을 얻는다.
   * - 비공개 (서버 전용): `APP_API_BASE_URL` 처럼 `NEXT_PUBLIC_` 접두사 없이 선언.
   * - 공개 (클라이언트 노출): `NEXT_PUBLIC_*` 접두사로 선언.
   */
  interface ProcessEnv {
    /** 백엔드 API 기본 URL — `next.config.ts` 의 `/proxy/app/*` rewrite 가 사용한다. */
    APP_API_BASE_URL?: string;
    /** 이미지 / 정적 리소스 호스트 — `/proxy/data/*` rewrite 가 사용한다. */
    APP_IMAGE_BASE_URL?: string;
    /** 운영 도메인 (예: `https://www.example.com`) — `sitemap.ts`, `robots.ts`, OG 메타 등에 사용한다. */
    NEXT_PUBLIC_SITE_URL?: string;
  }
}
