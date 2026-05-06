type StorageType = 'local' | 'session';

/**
 * SSR / 비활성화된 브라우저 환경에서도 안전하게 사용할 수 있는 `Storage` 래퍼.
 *
 * 동작 요약
 * - 서버(Node.js) 에서는 모든 메서드가 no-op 으로 작동한다 (값은 `null` 또는 빈 처리).
 * - 값은 항상 `JSON.stringify` / `JSON.parse` 를 거치므로, 객체 / 배열 / 원시 타입을 그대로 저장 / 조회할 수 있다.
 * - 시크릿 모드에서 `localStorage` 접근이 throw 하는 브라우저(Safari 등) 에서도 catch 후 안전하게 fallback 한다.
 * - 동일 API 의 `localStorage` 인스턴스(`storage`) 와 `sessionStorage` 인스턴스(`sessionStorage`) 를 함께 export 한다.
 *
 * 영구 상태(예: 다크모드 토글)는 `useLocalSettingsStore` / `useSessionSettingsStore` (zustand persist) 를 우선 사용하고,
 * 컴포넌트 단위에서 단발성으로 값을 읽고 써야 할 때 이 헬퍼를 사용한다.
 */
const createStorage = (type: StorageType) => {
  const getStore = (): Storage | null => {
    if (typeof window === 'undefined') return null;
    try {
      return type === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };

  return {
    /** 값을 읽어 `T` 로 파싱한다. 키가 없거나 파싱 실패 시 `null` 을 반환. */
    get<T = unknown>(key: string): T | null {
      const store = getStore();
      if (!store) return null;
      try {
        const raw = store.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    /** 값을 JSON 으로 직렬화해 저장한다. quota 초과 등 실패 시 silently 무시. */
    set(key: string, value: unknown): void {
      const store = getStore();
      if (!store) return;
      try {
        store.setItem(key, JSON.stringify(value));
      } catch {
        /* quota / private mode 실패는 무시 */
      }
    },

    /** 키를 삭제한다. */
    remove(key: string): void {
      const store = getStore();
      if (!store) return;
      try {
        store.removeItem(key);
      } catch {
        /* noop */
      }
    },

    /** 스토리지 전체를 비운다. (앱 단위 reset 같은 강제 작업에서만 사용) */
    clear(): void {
      const store = getStore();
      if (!store) return;
      try {
        store.clear();
      } catch {
        /* noop */
      }
    },
  };
};

/** SSR-safe `localStorage` 래퍼 (JSON 자동 직렬화). */
export const storage = createStorage('local');

/** SSR-safe `sessionStorage` 래퍼 (JSON 자동 직렬화). */
export const sessionStorage = createStorage('session');
