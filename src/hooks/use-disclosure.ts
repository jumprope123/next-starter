'use client';

import { useCallback, useState } from 'react';

type UseDisclosureReturn = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsOpen: (next: boolean) => void;
};

/**
 * 모달 / 드롭다운 / 시트 등 "열림 / 닫힘" 두 상태로 충분한 UI 의 보일러플레이트를 줄여 주는 훅.
 *
 * - `isOpen`, `open`, `close`, `toggle`, `setIsOpen` 을 한 번에 돌려준다.
 * - 모든 핸들러는 `useCallback` 으로 메모이제이션 되어 자식 컴포넌트의 불필요한 리렌더를 막는다.
 *
 * @example
 * const { isOpen, open, close } = useDisclosure();
 * return (
 *   <>
 *     <button onClick={open}>열기</button>
 *     <Modal open={isOpen} onClose={close} />
 *   </>
 * );
 */
export function useDisclosure(initial: boolean = false): UseDisclosureReturn {
  const [isOpen, setIsOpen] = useState<boolean>(initial);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return { isOpen, open, close, toggle, setIsOpen };
}
