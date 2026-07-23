'use client';

import { useCallback } from 'react';

import styles from './index.module.scss';

// 렌더마다 재생성되면 addEventListener / removeEventListener 짝이 어긋나므로 모듈 레벨에 고정한다.
const preventEvent = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
};

/**
 * 마우스 드래그(grab + drag)로 가로 스크롤을 조작할 수 있게 해 주는 훅.
 *
 * - 마우스로 컨테이너를 누른 채 좌우로 끌면 스크롤이 이동한다.
 * - 드래그 거리가 10px 을 넘으면, 직후의 자식 노드 클릭 이벤트를 막아 "드래그 끝의 우발적 클릭" 을
 *   방지한다. 드래그 거리가 10px 이하라면 클릭이 정상 통과된다.
 * - 반환된 `ref` 는 cleanup 을 반환하는 ref 콜백(React 19)으로, 노드가 바뀌거나 언마운트되면
 *   부착한 리스너(자식 click preventer 포함)를 자동으로 정리하고 새 노드에 다시 부착한다.
 * - `style` 은 `cursor: grab` 등 시각적 피드백을 주는 SCSS 모듈 클래스명이다.
 *
 * 터치 이벤트는 다루지 않으므로, 모바일/터치 디바이스에서는 브라우저 네이티브 스크롤이 그대로 동작한다.
 *
 * @returns `{ ref, style }`
 */
export function useGrabSlide() {
  const style = styles.container;

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    // 드래그 상태는 노드별 클로저에 격리한다 — 렌더링과 무관하므로 state 가 필요 없다.
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onGrab = (e: MouseEvent) => {
      preventEvent(e);
      isDown = true;
      startX = e.pageX - node.offsetLeft;
      scrollLeft = node.scrollLeft;
    };

    const onSlideEnded = (e: MouseEvent) => {
      isDown = false;

      const endX = e.pageX - node.offsetLeft;
      // click 이벤트의 target 은 요소이므로 텍스트 노드가 섞이는 childNodes 대신 children 을 사용한다.
      const children = [...node.children];
      const dragDiff = Math.abs(startX - endX);
      if (dragDiff > 10) {
        children.forEach((child) => child.addEventListener('click', preventEvent));
      } else {
        children.forEach((child) => child.removeEventListener('click', preventEvent));
      }
    };

    const onSlide = (e: MouseEvent) => {
      preventEvent(e);
      if (!isDown) {
        return;
      }
      const x = e.pageX - node.offsetLeft;
      const walk = x - startX;
      node.scrollLeft = scrollLeft - walk;
    };

    node.addEventListener('mousedown', onGrab);
    node.addEventListener('mouseleave', onSlideEnded);
    node.addEventListener('mouseup', onSlideEnded);
    node.addEventListener('mousemove', onSlide);

    return () => {
      node.removeEventListener('mousedown', onGrab);
      node.removeEventListener('mouseleave', onSlideEnded);
      node.removeEventListener('mouseup', onSlideEnded);
      node.removeEventListener('mousemove', onSlide);
      // 드래그 후 자식에 붙여 둔 click preventer 도 함께 정리해 누수를 막는다.
      [...node.children].forEach((child) => child.removeEventListener('click', preventEvent));
    };
  }, []);

  return { ref, style };
}
