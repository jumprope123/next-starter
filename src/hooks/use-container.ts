'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Property } from 'csstype';

import { useMedia } from './use-media';

/**
 * 가로 1920px 를 초과하는 와이드 화면에서 좌우에 동일한 여백을 주어 컨텐츠를 중앙 정렬할 수 있는
 * `padding` 값을 계산해 반환한다.
 *
 * - 1920px 이하의 화면: 1024px 이상이면 `0 32px`, 그 미만이면 `0 20px`.
 * - 1920px 초과 화면: `0 calc(32px + (clientWidth - 1920) / 2 px)` 로 좌우에 균등한 여백을 추가한다.
 *
 * `window.resize` 이벤트를 구독해 뷰포트가 바뀌면 자동으로 재계산한다. 클라이언트 전용
 * 훅이며, 컨테이너 div 의 인라인 스타일에 그대로 사용할 수 있도록 `csstype` 의 `Property.Padding`
 * 타입으로 반환한다.
 *
 * @example
 * const { padding } = useContainer();
 * return <main style={{ padding }}>...</main>;
 */
export function useContainer() {
  const calculateOverflowPadding = useCallback(() => {
    const { clientWidth } = document.documentElement;

    if (clientWidth <= 1920) {
      return 0;
    } else {
      return (clientWidth - 1920) / 2;
    }
  }, []);

  // SSR 중에는 document 가 없으므로 0 으로 시작하고, 클라이언트에서만 초기값을 계산한다.
  const [overflowPadding, setOverflowPadding] = useState<number>(() =>
    typeof document === 'undefined' ? 0 : calculateOverflowPadding()
  );
  const { lg } = useMedia();
  const padding: Property.Padding = useMemo(
    () => (lg ? `0 calc(32px + ${overflowPadding}px)` : `0 20px`),
    [overflowPadding, lg]
  );

  // 함수를 그대로 넘기면 React 가 functional updater 로 해석한다 — 지금은 인자를 무시해
  // 우연히 동작하지만, 시그니처가 바뀌는 순간 조용히 깨진다. 값을 계산해서 넘긴다.
  const onResize = useCallback(() => setOverflowPadding(calculateOverflowPadding()), [calculateOverflowPadding]);

  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [onResize]);

  return { padding };
}
