'use client';

import { useEffect } from 'react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * 루트 레이아웃 자체에서 에러가 나는 최악의 경우를 위한 글로벌 폴백.
 *
 * 일반 라우트 에러는 `app/[locale]/error.tsx` 가 처리하므로, 이 파일은 거의 트리거되지 않는다.
 * 하지만 Next.js 가 이 파일을 발견하지 못하면 자체 흰 화면을 띄우므로, 최소한의 형태로라도 두는 것을 권장한다.
 *
 * `<html>` / `<body>` 를 직접 렌더해야 하는 점에 주의 (루트 레이아웃이 마운트되지 않은 상태일 수 있음).
 */
export default function GlobalError({ error, reset }: Readonly<Props>) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color: '#171717',
          background: '#ffffff',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, color: '#a1a1aa', margin: 0 }}>Critical error</p>
        <h1 style={{ fontSize: 22, margin: 0 }}>앱을 표시할 수 없어요</h1>
        <p style={{ fontSize: 13, color: '#52525b', maxWidth: 360 }}>
          {error?.message ?? '알 수 없는 오류가 발생했습니다.'}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            borderRadius: 6,
            background: '#18181b',
            color: '#fff',
            border: 0,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
