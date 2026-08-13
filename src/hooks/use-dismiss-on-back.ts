'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { pushBackHandler } from '@/core';

type Options = {
  /** false 면 등록을 건너뛴다. 절대 back 으로 닫혀선 안 되는 모달용 escape hatch. 기본 true. */
  enabled?: boolean;
  /**
   * 페이지 "마운트와 동시에" 등록하는 경우(예: 결제 복귀 back 인터셉터)에만 true.
   *
   * 라우트 이동으로 페이지가 마운트되는 그 commit 에서, BackButtonHandler 의
   * `clearBackStackOnRouteChange`(pathname useEffect = passive) 가 stack 을 비운다. 그런데 이 훅의
   * layout effect 등록은 같은 commit 에서 passive 보다 먼저 실행되므로, 등록 직후 clear 가 핸들러를
   * 지워버린다 (prod 에서 재현 — dev 는 useSearchParams 가 늦게 채워져 등록이 clear 뒤로 밀려 우연히 생존).
   *
   * true 면 등록을 macrotask(setTimeout 0)로 미뤄 clear(passive) 이후에 push 한다. 사용자가 즉시
   * back 을 누르는 자동모달에는 부적합(첫 프레임 race)하므로, 마운트 후 잠시 뒤 back 하는 화면에만 쓴다.
   */
  deferUntilAfterRouteChange?: boolean;
};

/**
 * SSR 안전 layout effect.
 * 모달이 paint 되는 시점에 sentinel 이 history 에 박혀 있어야 native (iOS / Android WebView) 가
 * "back 가능" 으로 인식한다. useEffect 로 늦게 push 하면, history.length === 1 인 진입 직후
 * 자동 모달의 첫 프레임에 사용자가 안드 back 을 누를 때 native 가 web 에 위임 안 하고
 * WebView 자체를 닫으려 시도하는 race 가 생긴다.
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * 모달 / 바텀시트 / 다이얼로그가 사용하는 훅 — **뒤로가기로 모달 닫기**의 소비자 API.
 *
 * - open === true && enabled !== false 동안 BackStack 에 onClose 핸들러를 등록한다.
 * - 안드로이드 하드웨어 back, 브라우저 back 으로 sentinel 이 pop 되면 onClose 가 호출된다.
 * - X / 오버레이 클릭 등 컴포넌트 내부 close 트리거는 평소처럼 onClose 를 직접 호출하면 되며,
 *   외부에서 props.open 이 false 로 바뀌어 cleanup 이 발화되는 시점에 sentinel entry 가 자동 정리된다.
 * - sentinel push 는 paint 전 layout 단계에서 수행되어, 자동 모달의 첫 프레임 race 를 방지한다.
 *
 * @example
 * const { isOpen, open, close } = useDisclosure();
 * useDismissOnBack(isOpen, close);
 */
export function useDismissOnBack(
  open: boolean,
  onClose: () => void,
  { enabled = true, deferUntilAfterRouteChange = false }: Options = {}
): void {
  const onCloseRef = useRef(onClose);
  // eslint-disable-next-line react-hooks/refs -- 최신 onClose 를 ref 에 보관(effect 콜백에서 stale 회피)
  onCloseRef.current = onClose;

  useIsomorphicLayoutEffect(() => {
    if (!enabled || !open) return;
    if (!deferUntilAfterRouteChange) {
      return pushBackHandler(() => onCloseRef.current());
    }
    // 라우트 clear(passive) 이후에 등록되도록 macrotask 로 미룬다. (옵션 설명 참조)
    let unregister: (() => void) | undefined;
    const timer = setTimeout(() => {
      unregister = pushBackHandler(() => onCloseRef.current());
    }, 0);
    return () => {
      clearTimeout(timer);
      unregister?.();
    };
  }, [open, enabled, deferUntilAfterRouteChange]);
}
