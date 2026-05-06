'use client';

import { create } from 'zustand';
import { MEDIA_STORE_DEFAULT_VALUE, MediaStore } from '.';

export * from './index.type';
export * from './index.constants';

/**
 * Tailwind 의 기본 브레이크포인트(`sm`, `md`, `lg`, `xl`) 매칭 결과를 보관하는 zustand store.
 *
 * 직접 구독하기보다는 `useMedia()` 훅을 통해 사용하는 것을 권장한다. `useMedia` 가 미디어
 * 쿼리 변경을 감지해 `setMedia` 로 이 store 를 갱신하므로, 다른 컴포넌트는 동일한 브레이크포인트
 * 상태를 별도 리스너 없이 공유할 수 있다.
 */
export const useMediaStore = create<MediaStore>()((set) => ({
  ...MEDIA_STORE_DEFAULT_VALUE,
  setMedia: (media) => set({ ...media }),
}));
