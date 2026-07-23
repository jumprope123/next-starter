'use client';

import { useEffect } from 'react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * 라우트 세그먼트 에러 폴백.
 *
 * 해당 세그먼트(또는 자식) 에서 던져진 에러가 있을 때, Next.js 가 이 컴포넌트로 폴백한다.
 * `reset()` 호출 시 같은 세그먼트를 재시도(다시 렌더) 한다.
 *
 * 외부 모니터링(Sentry 등) 으로 보고하려면 `useEffect` 안에서 같이 호출한다.
 */
export default function ErrorPage({ error, reset }: Readonly<Props>) {
  useEffect(() => {
    console.error('[route-error]', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen-enhanced w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-5 py-12 text-center">
      <p className="text-sm font-medium text-rose-500">Error</p>
      <h1 className="text-2xl font-bold">문제가 발생했어요</h1>
      <p className="max-w-md text-sm text-zinc-600">{error?.message ?? '잠시 후 다시 시도해주세요.'}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        다시 시도
      </button>
    </main>
  );
}
