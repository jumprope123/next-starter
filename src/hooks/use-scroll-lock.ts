'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * body 스크롤 락 (모듈 전역 참조 카운팅 + CSS 클래스 토글) — usehooks-ts 의 `useScrollLock` 대체.
 *
 * 왜 클래스 토글인가 (중요):
 * usehooks-ts(및 흔한 구현)는 lock 시점의 `body.style.overflow` 를 저장했다가 unlock 시 복원한다.
 * 그런데 body 의 overflow 를 **inline 으로 직접 만지는 다른 시스템**(react-modal-sheet, vaul,
 * 이미지뷰어 모달 등)이 먼저 'hidden' 을 걸어두면, 우리가 그 'hidden' 을 저장 → 마지막 unlock 에
 * 'hidden' 으로 복원 → **body 영구 락**이 된다 (cross-system stale 복원).
 *
 * 해결: inline 을 읽거나 쓰지 않고 **`body.app-scroll-locked` 클래스만 토글**한다(전역 카운터로
 * 첫 lock 에 추가, 마지막 unlock 에 제거). 클래스(overflow:hidden) 와 3rd-party 의 inline 은
 * 서로 직교라, 우리가 풀어도 3rd-party 의 inline 락은 그대로 남고(반대도 동일) stale 복원이 없다.
 * CSS 규칙은 globals.css 의 `body.app-scroll-locked { overflow: hidden }`.
 *
 * 인터페이스는 usehooks-ts 와 동일(`{ isLocked, lock, unlock }`, `autoLock` 기본 true)이라 drop-in.
 */
const LOCK_CLASS = 'app-scroll-locked';
let lockCount = 0;

const applyLock = (): void => {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    document.body.classList.add(LOCK_CLASS);
  }
  lockCount += 1;
};

const releaseLock = (): void => {
  if (typeof document === 'undefined' || lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.classList.remove(LOCK_CLASS);
  }
};

type UseScrollLockOptions = { autoLock?: boolean };

export function useScrollLock(options?: UseScrollLockOptions): {
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
} {
  const autoLock = options?.autoLock ?? true;
  const heldRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);

  const lock = useCallback(() => {
    if (heldRef.current) return;
    heldRef.current = true;
    applyLock();
    setIsLocked(true);
  }, []);

  const unlock = useCallback(() => {
    if (!heldRef.current) return;
    heldRef.current = false;
    releaseLock();
    setIsLocked(false);
  }, []);

  // autoLock 이면 마운트 시 락. 이 경로는 isLocked state 를 건드리지 않는다(autoLock 소비자는
  // isLocked 를 읽지 않음 — set-state-in-effect 회피). 언마운트 시 본인이 잡은 락을 반드시 해제.
  useEffect(() => {
    if (autoLock && !heldRef.current) {
      heldRef.current = true;
      applyLock();
    }
    return () => {
      if (heldRef.current) {
        heldRef.current = false;
        releaseLock();
      }
    };
  }, [autoLock]);

  return { isLocked, lock, unlock };
}
