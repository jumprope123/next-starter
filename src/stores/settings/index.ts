import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
    }
  )
);
