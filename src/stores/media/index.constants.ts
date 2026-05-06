import { MediaStoreGetter } from '.';

/**
 * 미디어 store 의 초기값.
 *
 * SSR 환경에서는 미디어 쿼리를 평가할 수 없으므로 모든 브레이크포인트를 `false` 로 둔다.
 * 첫 클라이언트 페인트 직후 `useMedia()` 가 실제 매칭 결과로 덮어쓴다.
 */
export const MEDIA_STORE_DEFAULT_VALUE = {
  sm: false,
  md: false,
  lg: false,
  xl: false,
} satisfies MediaStoreGetter;
