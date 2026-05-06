'use client';

import type { RefObject } from 'react';
import { useEffect } from 'react';

/**
 * 지정한 ref 외부에서 마우스 클릭이 발생했을 때 핸들러를 호출한다.
 *
 * - `mouseup` 이벤트 기준으로 동작하므로, 드래그 후 외부에서 mouseup 한 경우에도 트리거된다.
 *   그 점이 문제라면 호출 측에서 드래그 여부를 별도로 추적해야 한다.
 * - `elementId` 가 주어지면 해당 ID 를 가진 요소에서 발생한 이벤트는 외부 클릭으로 간주하지 않는다.
 *   (예: 드롭다운을 토글하는 버튼처럼 "외부지만 외부 처리하면 안 되는" 요소를 예외 처리할 때 사용)
 *
 * @param ref 내부 영역으로 간주할 요소의 ref
 * @param handler 외부 클릭 시 호출될 콜백
 * @param elementId 외부 클릭 처리에서 제외할 요소의 ID
 */
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  elementId?: string
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;
      if (!el || el.contains(event.target as Node)) {
        return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if (event.target && (event.target as any).id === elementId) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mouseup', listener);

    return () => {
      document.removeEventListener('mouseup', listener);
    };
  }, [ref, handler, elementId]);
}
