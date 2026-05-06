'use client';

import { useCallback, useState } from 'react';

/**
 * boolean 상태를 토글하는 단순 훅.
 *
 * `useState<boolean>` + `setState((v) => !v)` 패턴을 짧게 줄여 준다. 명시적인 강제 set 도 함께 노출한다.
 *
 * @example
 * const [isDark, toggleDark, setIsDark] = useToggle();
 */
export function useToggle(initial: boolean = false): [boolean, () => void, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue];
}
