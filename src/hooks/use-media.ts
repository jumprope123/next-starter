'use client';

import { useMediaQuery } from 'usehooks-ts';
import { useCallback, useLayoutEffect } from 'react';
import { useMediaStore } from '@/stores';

/**
 * Tailwind 의 기본 브레이크포인트(`sm`, `md`, `lg`, `xl`)에 맞춰 현재 뷰포트 상태를 반환한다.
 *
 * 내부적으로 `usehooks-ts` 의 `useMediaQuery` 4 개를 구독해 boolean 을 만든 뒤, 결과를
 * 전역 `useMediaStore`(zustand)에 동기화한다. 이렇게 동기화된 값을 다시 store 에서 꺼내
 * 반환하므로, 동일한 페이지 안의 여러 컴포넌트가 동일한 미디어 상태를 공유하면서도
 * 추가 리스너 등록 비용이 발생하지 않는다.
 *
 * - SSR 첫 렌더에서는 모든 값이 기본값(보통 `false`)이며, 클라이언트 마운트 직후
 *   `useLayoutEffect` 에서 한 번 store 를 갱신한다.
 * - 매칭 조건은 `min-width` 기준이므로 더 큰 브레이크포인트는 더 작은 브레이크포인트도
 *   동시에 `true` 가 된다. (예: `xl` 인 경우 `sm`, `md`, `lg` 도 `true`)
 *
 * @returns `{ sm, md, lg, xl }` boolean 객체
 */
export function useMedia() {
  const smQuery = useMediaQuery('(min-width: 640px)');
  const mdQuery = useMediaQuery('(min-width: 768px)');
  const lgQuery = useMediaQuery('(min-width: 1024px)');
  const xlQuery = useMediaQuery('(min-width: 1280px)');
  const { sm, md, lg, xl, setMedia } = useMediaStore();

  const updateMediaState = useCallback(
    () => setMedia({ sm: smQuery, md: mdQuery, lg: lgQuery, xl: xlQuery }),
    [setMedia, smQuery, mdQuery, lgQuery, xlQuery]
  );

  useLayoutEffect(updateMediaState, [updateMediaState]);

  return { sm, md, lg, xl };
}
