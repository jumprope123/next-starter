'use client';

import { type RefObject, useCallback, useLayoutEffect } from 'react';

interface Props {
  focusedRef: RefObject<HTMLElement | null>;
  parentRef: RefObject<HTMLElement | null>;
  scrollOffset?: number;
  initialScroll?: boolean;
}

/**
 * 가로 스크롤 컨테이너에서 특정 자식 요소를 보이는 영역으로 스크롤한다.
 *
 * - 부모 컨테이너의 `padding-left` 와 같은 위치에 있는 첫 번째 노드는 스크롤하지 않는다.
 * - 이동 거리(`moveOffset`)가 뷰포트 너비보다 크면 `instant` 로, 그렇지 않으면 `smooth` 로
 *   스크롤한다 (호출 시 `behavior` 인자로 강제 지정 가능).
 * - `initialScroll` 이 `true` 면 마운트 직후(`useLayoutEffect`)에 한 번 자동 스크롤한다.
 *
 * @param focusedRef 스크롤 대상이 될 자식 요소 ref
 * @param parentRef 가로 스크롤이 발생하는 부모 컨테이너 ref
 * @param scrollOffset 추가로 빼 줄 좌측 오프셋 (px)
 * @param initialScroll 마운트 시 자동 스크롤 여부
 * @returns 수동 스크롤 트리거에 사용할 `scroll(behavior?)` 함수
 */
export function useFocusScroll({ focusedRef, parentRef, scrollOffset = 0, initialScroll }: Readonly<Props>) {
  const scroll = useCallback(
    (behavior?: ScrollBehavior) => {
      if (parentRef.current && focusedRef.current) {
        const startPadding = parseInt(getComputedStyle(parentRef.current).paddingLeft);
        const parentRect = parentRef.current.getBoundingClientRect();
        const targetRect = focusedRef.current.getBoundingClientRect();
        const targetPosition = targetRect.left - parentRect.left + parentRef.current.scrollLeft;

        // 첫번째 노드 예외 처리
        if (startPadding === targetPosition && parentRef.current.scrollLeft === 0) return;

        const targetOffset = targetPosition - scrollOffset;
        const currentOffset = parentRef.current.scrollLeft;
        const moveOffset = Math.abs(targetOffset - currentOffset);

        parentRef.current.scrollTo({
          left: targetOffset,
          behavior: (behavior ?? moveOffset > document.documentElement.clientWidth) ? 'instant' : 'smooth',
        });
      }
    },
    [focusedRef, parentRef, scrollOffset]
  );

  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && initialScroll) scroll();
  }, [initialScroll, scroll]);

  return { scroll };
}
