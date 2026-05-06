/** `useMediaStore` 의 전체 타입 (상태 + 액션). */
export type MediaStore = MediaStoreGetter & MediaStoreSetter;

/** 현재 매칭 중인 Tailwind 브레이크포인트 상태. `min-width` 기준이라 큰 값이 참이면 작은 값도 참. */
export type MediaStoreGetter = {
  /** ≥ 640px */
  sm: boolean;
  /** ≥ 768px */
  md: boolean;
  /** ≥ 1024px */
  lg: boolean;
  /** ≥ 1280px */
  xl: boolean;
};

export type MediaStoreSetter = {
  /** 4 개 브레이크포인트를 일괄 업데이트한다. 부분 업데이트도 가능. */
  setMedia: (media: Partial<MediaStoreGetter>) => void;
};
