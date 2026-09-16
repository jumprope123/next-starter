'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * 가로 스크롤 캐러셀에서 현재 보고 있는 "페이지" 인덱스를 추적하고, 특정 페이지로 이동시키는 훅.
 *
 * - 페이지는 `1` 부터 시작한다 (`Math.round(scrollLeft / offsetWidth) + 1`).
 * - 반환된 `ref` 는 ref 콜백이며, 같은 컴포넌트에서 노드가 교체되면 자동으로 이전 리스너를 해제하고
 *   새 노드에 다시 부착한다. `useCallback` 으로 **identity 를 고정**해 두었다 — 고정하지 않으면
 *   React 가 렌더마다 ref 를 떼었다 붙이면서 `ResizeObserver` 를 매번 새로 만든다.
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

  const countScrollPage = useCallback(() => {
    const node = element.current;
    // 레이아웃 전이거나 숨겨진 컨테이너는 offsetWidth 가 0 이라 나눗셈이 NaN/Infinity 가 된다.
    if (!node || node.offsetWidth <= 0) return;
    setPage(Math.round(node.scrollLeft / node.offsetWidth) + 1);
  }, []);

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      const previous = element.current;
      if (previous) {
        previous.removeEventListener('scroll', countScrollPage);
        observer.current?.disconnect();
        observer.current = null;
        element.current = null;
      }

      if (node) {
        element.current = node;
        node.addEventListener('scroll', countScrollPage, { passive: true });
        // `resize` 이벤트는 window 에서만 발생하므로, 컨테이너 크기 변화는 ResizeObserver 로 감지한다.
        observer.current = new ResizeObserver(countScrollPage);
        observer.current.observe(node);
      }
    },
    [countScrollPage]
  );

  const changePage = useCallback((v: number, options?: { behavior?: ScrollBehavior }) => {
    const node = element.current;
    if (!node) return;
    node.scrollTo({ left: node.offsetWidth * (v - 1), behavior: options?.behavior ?? 'smooth' });
  }, []);

  return { ref, page, changePage };
}
