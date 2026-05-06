/** `useMobileStore` 의 전체 타입 (상태 + 액션). */
export type MobileStore = MobileStoreGetter & MobileStoreSetter;

export type MobileStoreGetter = {
  /** `mobile-detect` 가 모바일 디바이스로 판정했는지 여부. */
  isMobile: boolean;
  /** OS 가 Android 인지 여부. */
  isAndroid: boolean;
  /** OS 가 iOS / iPadOS 인지 여부. */
  isIOS: boolean;
  /**
   * `<MobileDetector />` 가 한 번이라도 분석을 끝냈는지 여부.
   * `false` 인 동안에는 모든 디바이스 플래그가 기본값(`false`) 이므로,
   * 디바이스 분기 UI 는 이 값이 `true` 가 된 뒤에 렌더하는 것이 안전하다.
   */
  isReady: boolean;
};

export type MobileStoreSetter = {
  setIsMobile: (isMobile: boolean) => void;
  setIsAndroid: (isAndroid: boolean) => void;
  setIsIOS: (isIOS: boolean) => void;
  setIsReady: (isReady: boolean) => void;
};
