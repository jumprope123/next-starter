/**
 * `useAppTranslation` / `getServerAppTranslation` 의 호출 옵션.
 *
 * - `fallback`: 키가 없거나 `t(key)` 가 키 자체를 그대로 돌려줄 때(=missing) 대신 보여줄 값.
 *   카탈로그가 비어 있어도 UI 가 깨지지 않도록 호출부마다 한국어 원문을 박아 둘 때 사용한다.
 * - `values`: next-intl 의 placeholder 치환용 변수 묶음. (`{name}` 같은 placeholder 와 매칭)
 */
export type AppTranslationOptions = {
  fallback?: string;
  values?: Record<string, string | number | Date>;
};

/** next-intl 의 `t()` 를 fallback / values 지원으로 감싼 함수 시그니처. */
export type AppT = (key: string, options?: AppTranslationOptions) => string;
