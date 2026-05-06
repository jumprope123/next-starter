'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';

/**
 * 새 `QueryClient` 인스턴스를 만들어 돌려준다.
 *
 * - 기본 `staleTime: 2000` 이라 짧은 시간 안에 들어오는 동일 키 요청이 자연스럽게 합쳐진다.
 * - `refetchOnWindowFocus` 는 기본 `false`. 포커스 복귀마다 재요청이 필요하면 호출부에서 켠다.
 *
 * 페이지/훅 단위 캐시 정책이 다르다면 `useQuery` 의 `staleTime` / `gcTime` 등을 덮어쓰면 된다.
 */
const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 2,
        refetchOnWindowFocus: false,
      },
    },
  });

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * 환경에 따라 적절한 `QueryClient` 를 가져온다.
 *
 * - 서버: 매 요청마다 새 인스턴스 (요청 간 캐시 격리).
 * - 브라우저: 모듈 스코프 싱글턴 (탭 단위로 캐시 유지).
 *
 * 이 패턴은 React 19 / Next.js App Router 의 SSR + Suspense 환경에서 권장되는 방식이다.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/ssr
 */
const getQueryClient = (): QueryClient => {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
};

/**
 * 앱 전역에서 `@tanstack/react-query` 를 사용할 수 있도록 `QueryClientProvider` 를 마운트한다.
 *
 * 외부에서 `QueryClient` 인스턴스에 직접 접근해야 한다면 `useQueryClient()` 훅을 사용한다.
 */
export function QueryProvider({ children }: Readonly<PropsWithChildren>) {
  const [queryClient] = useState(() => getQueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
