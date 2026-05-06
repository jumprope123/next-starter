'use client';

import { useEffect, useState } from 'react';

/**
 * 컴포넌트가 클라이언트에서 마운트된 이후인지 알려 주는 훅.
 *
 * SSR 첫 렌더에서는 `false` 를 반환하고, 클라이언트 첫 effect 가 실행된 직후 `true` 로 바뀐다.
 * 그래서 hydration 부조화를 일으킬 수 있는 클라이언트 전용 UI(`window` 의존, theme 토글 등)
 * 를 안전하게 분기 렌더할 때 사용한다.
 *
 * 단순 분기보다는 가능하면 `<ClientOnly>` 컴포넌트 사용을 우선 검토한다.
 *
 * @example
 * const mounted = useMounted();
 * if (!mounted) return <Skeleton />;
 * return <ClientOnlyWidget />;
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    // hydration 직후 한 번만 true 로 전환하는 의도된 패턴이므로 set-state-in-effect 룰을 우회한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted;
}
