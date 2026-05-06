'use client';

import { create } from 'zustand';
import { MobileStore } from '.';

export * from './index.type';

/**
 * User-Agent 분석 결과를 담는 zustand store.
 *
 * 값은 `<MobileDetector />` 컴포넌트가 마운트 직후 한 번 채워 넣는다. 클라이언트가 마운트되기 전에는
 * 모든 값이 `false` (`isReady === false`) 이므로, 디바이스 분기 렌더링이 SSR 결과와 어긋나지 않도록
 * `isReady` 가 `true` 가 된 시점부터 분기 UI 를 렌더하는 것이 안전하다.
 */
export const useMobileStore = create<MobileStore>()((set) => ({
  isMobile: false,
  setIsMobile: (isMobile: boolean) => set({ isMobile }),

  isAndroid: false,
  setIsAndroid: (isAndroid: boolean) => set({ isAndroid }),

  isIOS: false,
  setIsIOS: (isIOS: boolean) => set({ isIOS }),

  isReady: false,
  setIsReady: (isReady: boolean) => set({ isReady }),
}));
