'use client';

import { useRef, useState } from 'react';

/**
 * 가로 스크롤 캐러셀에서 현재 보고 있는 "페이지" 인덱스를 추적하고, 특정 페이지로 이동시키는 훅.
 *
 * - 페이지는 `1` 부터 시작한다 (`Math.round(scrollLeft / offsetWidth) + 1`).
 * - 반환된 `ref` 는 ref 콜백이며, 같은 컴포넌트에서 노드가 교체되면 자동으로 이전 리스너를 해제하고
 *   새 노드에 다시 부착한다.
 * - `changePage(n)` 은 기본적으로 부드러운 스크롤(`smooth`)로 이동한다.
 *
 * @returns
 *  - `ref` : 캐러셀 컨테이너에 부착할 ref 콜백
 *  - `page` : 현재 페이지 (1-base)
 *  - `changePage(v, options)` : 특정 페이지로 스크롤
 */
export function useScrollPage() {
  const element = useRef<HTMLDivElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [page, setPage] = useState<number>(1);

  const initElement = (node: HTMLDivElement) => {
    if (element.current) {
      removeListener();
    }

    if (node) {
      element.current = node;
      addListener();
    }
  };

  const countScrollPage = () => {
    if (!element.current) {
      return;
    }

    setPage(+(element.current.scrollLeft / element.current.offsetWidth).toFixed(0) + 1);
  };

  const changePage = (v: number, options?: { behavior?: ScrollBehavior }) => {
    if (element.current) {
      element.current.scrollTo({
        left: element.current.offsetWidth * (v - 1),
        behavior: options?.behavior ?? 'smooth',
      });
    }
  };

  const addListener = () => {
    if (element.current) {
      element.current.addEventListener('scroll', countScrollPage);
      // `resize` 이벤트는 window 에서만 발생하므로, 컨테이너 크기 변화는 ResizeObserver 로 감지한다.
      observer.current = new ResizeObserver(countScrollPage);
      observer.current.observe(element.current);
    }
  };

  const removeListener = () => {
    if (element.current) {
      element.current.removeEventListener('scroll', countScrollPage);
    }
    observer.current?.disconnect();
    observer.current = null;
  };

  return { ref: initElement, page, changePage };
}
