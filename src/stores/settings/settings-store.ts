'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * 영속 설정 store 들.
 *
 * ## `skipHydration: true` 인 이유 (중요 — 지우지 말 것)
 *
 * zustand 의 `persist` 는 기본적으로 **store 생성 시점(= 모듈 평가 시점)에 동기로** 저장소를
 * 읽어 상태를 덮어쓴다. 모듈 평가는 React 의 첫 렌더보다 먼저 일어나므로:
 *
 *  - 서버는 기본값(`isDarkMode: false`)으로 HTML 을 렌더하고,
 *  - 클라이언트는 이미 복원된 값(`true`)으로 첫 렌더를 수행한다
 *  → 두 결과가 달라 **hydration mismatch** 가 난다 (React 가 트리를 버리고 다시 그린다).
 *
 * 그래서 자동 복원을 끄고, 첫 페인트 이후(`<SettingsHydrator />` 의 effect)에 복원한다.
 * 복원 전까지는 기본값이므로, 저장된 값에 따라 화면이 달라지는 UI 는 복원 시점에 한 번
 * 바뀐다. 그 전환조차 보이지 않아야 한다면 해당 UI 를 `<ClientOnly>` 로 감싸거나
 * `useSettingsHydrated()` 로 게이트한다.
 */

type SessionSettingsStoreState = {
  isLaunched: boolean;
  setIsLaunched: (isLaunched: boolean) => void;
};

type LocalSettingsStoreState = {
  isDarkMode: boolean;
  setIsDarkMode: (isDarkMode: boolean) => void;
};

export const useSessionSettingsStore = create<SessionSettingsStoreState>()(
  persist(
    (set) => ({
      isLaunched: false,
      setIsLaunched: (isLaunched) => set({ isLaunched }),
    }),
    {
      name: 'template-session-settings',
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    }
  )
);

export const useLocalSettingsStore = create<LocalSettingsStoreState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      setIsDarkMode: (isDarkMode) => set({ isDarkMode }),
    }),
    {
      name: 'template-local-settings',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
