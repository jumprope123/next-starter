'use client';

import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { PropsWithChildren } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from './query-provider/query-provider';

/**
 * 클라이언트 전용 Provider 들을 한 번에 래핑하는 셸.
 *
 * `[locale]/layout.tsx` 에서 `NextIntlClientProvider` 안쪽으로 마운트되며,
 * react-query / nuqs (URL 상태) / react-hot-toast 를 모두 켠다.
 * 새 클라이언트 Provider 가 생기면 여기에 추가한다.
 */
export function AppShellProviders({ children }: Readonly<PropsWithChildren>) {
  return (
    <QueryProvider>
      <NuqsAdapter>{children}</NuqsAdapter>
      {/* containerClassName="app-toaster": 토스트 겹쳐 덮기 (styles/toast.css) */}
      <Toaster position="bottom-center" containerClassName="app-toaster" />
    </QueryProvider>
  );
}
