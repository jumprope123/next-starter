'use client';

import type { ReactNode } from 'react';
import { useMounted } from '@/hooks';

type Props = {
  children: ReactNode;
  /** 마운트 전에 보여 줄 폴백 (보통 스켈레톤). 미지정 시 아무것도 렌더하지 않는다. */
  fallback?: ReactNode;
};

/**
 * 자식 트리를 클라이언트 마운트 이후에만 렌더해 hydration 부조화를 방지하는 컴포넌트.
 *
 * SSR 출력과 첫 클라이언트 렌더가 동일해야 React 의 hydration 이 깨지지 않는다. 다음과 같은
 * 케이스는 컴포넌트 자체를 `<ClientOnly>` 로 감싸 두는 것이 가장 단순하다.
 *
 * - `localStorage` / `window` / `navigator` 에 의존하는 위젯
 * - `useTheme` 처럼 시스템 환경에 따라 분기 렌더되는 컴포넌트
 * - 외부 SDK(지도, 결제, 분석) 위젯
 *
 * @example
 * <ClientOnly fallback={<Skeleton width={120} height={32} />}>
 *   <ThirdPartyWidget />
 * </ClientOnly>
 */
export function ClientOnly({ children, fallback = null }: Readonly<Props>) {
  const mounted = useMounted();
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
