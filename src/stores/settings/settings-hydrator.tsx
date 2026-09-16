'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { useLocalSettingsStore, useSessionSettingsStore } from './settings-store';

/**
 * `skipHydration: true` 로 꺼둔 영속 store 복원을 **첫 페인트 이후에** 수행한다.
 *
 * 모듈 평가 시점에 복원하면 서버 렌더 결과(기본값)와 클라이언트 첫 렌더(복원값)가 어긋나
 * hydration mismatch 가 난다. effect 는 hydration 이 끝난 뒤 실행되므로 안전하다.
 * (자세한 배경은 `stores/settings/settings-store.ts` 상단 주석 참조.)
 *
 * 렌더 트리에는 아무것도 그리지 않는 사이드이펙트 전용 컴포넌트이므로 루트 layout 에 한 번만
 * 마운트한다.
 */
export function SettingsHydrator(): null {
  useEffect(() => {
    void useLocalSettingsStore.persist.rehydrate();
    void useSessionSettingsStore.persist.rehydrate();
  }, []);

  return null;
}

const subscribeHydration = (onChange: () => void): (() => void) => {
  const unsubLocal = useLocalSettingsStore.persist.onFinishHydration(onChange);
  const unsubSession = useSessionSettingsStore.persist.onFinishHydration(onChange);
  return () => {
    unsubLocal();
    unsubSession();
  };
};

/**
 * 영속 store 복원이 끝났는지 여부.
 *
 * 저장된 값에 따라 화면이 달라지는 UI 가 "기본값 → 복원값" 으로 한 번 바뀌는 것이 거슬릴 때,
 * 이 값이 `true` 가 된 뒤에 렌더하면 전환이 보이지 않는다. 서버에서는 항상 `false`.
 *
 * @example
 * const hydrated = useSettingsHydrated();
 * if (!hydrated) return <Skeleton />;
 */
export function useSettingsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => useLocalSettingsStore.persist.hasHydrated() && useSessionSettingsStore.persist.hasHydrated(),
    () => false
  );
}
