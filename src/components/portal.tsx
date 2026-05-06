'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';

type Props = {
  children: ReactNode;
};

/**
 * `#next-app-portal` 요소로 children 을 포털링하는 컴포넌트.
 *
 * - `next/dynamic` + `ssr: false` 로 감싸 클라이언트에서만 렌더된다.
 * - 마운트 포인트인 `#next-app-portal` 은 루트 layout 에서 미리 그려 두어야 한다.
 *   해당 노드를 찾지 못하면 아무것도 렌더하지 않는다.
 *
 * 모달, 토스트, 드롭다운처럼 z-index / overflow 컨텍스트를 벗어나야 하는 UI 에 사용한다.
 */
export const Portal = dynamic(
  () =>
    Promise.resolve(function ({ children }: Readonly<Props>) {
      const node = document.querySelector('#next-app-portal');

      if (node) return createPortal(children, node);

      return null;
    }),
  { ssr: false }
);
