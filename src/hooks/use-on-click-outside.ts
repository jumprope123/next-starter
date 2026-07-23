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
      // 마우스 보조 버튼(가운데·오른쪽·뒤로·앞으로)으로 발생한 mouseup 은 바깥 클릭으로 보지 않는다.
      // 특히 게이밍 마우스의 뒤로가기 버튼(button 3)은 mouseup 직후 브라우저 history back 을
      // 일으키는데, 이를 바깥 클릭으로 처리하면 모달이 back 이 아닌 경로로 닫혀 stale sentinel 이
      // 남고, 이어서 실제 페이지가 뒤로 가버린다. 좌클릭(button 0)만 dismiss 트리거로 인정한다.
      if ('button' in event && event.button !== 0) return;

      const el = ref?.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      } else if (event.target instanceof Element && event.target.id === elementId) {
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
