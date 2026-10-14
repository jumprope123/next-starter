'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * 화면이 숨겨질 때(Cache Components 의 `<Activity mode="hidden">`) 일시 state·ref 를 되돌린다.
 *
 * Cache Components 에서는 떠난 화면이 언마운트되지 않고 숨겨진 채 state 가 남는다.
 * "화면을 떠나면 초기화된다"가 전제였던 진행 플래그·열린 모달·1회 가드 등을 이 훅으로 되돌린다.
 *
 * - layout effect cleanup 에서 예약하므로 화면이 다시 보이기 전에 반영된다.
 * - 한 번 마이크로태스크로 미룬다: dev StrictMode 는 마운트 직후 effect 를 cleanup → setup 으로 다시 돌리는데,
 *   이 둘은 동기로 이어지므로 setup 이 예약을 취소한다. 바로 실행하면 그 재실행을 숨김으로 오인한다.
 * - 언마운트 때도 실행된다. 로컬 state·ref 만 되돌리고 전역 스토어·라우팅·API 호출은 넣지 않는다.
 *
 * 자세한 배경은 docs/cache-components-guide.md.
 *
 * @example
 * const { isOpen, open, close } = useDisclosure();
 * useDismissOnBack(isOpen, close);
 * useResetOnHide(close); // 시트를 연 채 떠났다가 뒤로 돌아와도 닫혀 있다
 */
export function useResetOnHide(reset: () => void): void {
  const resetRef = useRef(reset);
  const pendingRef = useRef<object | null>(null);

  useLayoutEffect(() => {
    resetRef.current = reset;
  });

  useLayoutEffect(() => {
    pendingRef.current = null;
    return () => {
      const token = {};
      pendingRef.current = token;
      queueMicrotask(() => {
        if (pendingRef.current === token) resetRef.current();
      });
    };
  }, []);
}
