'use client';

import { useEffect } from 'react';

/**
 * **브라우저가 보관해 둔 문서(bfcache)로 돌아오면 새로 받는다** (Cache Components · 2026-10-14).
 *
 * 도입 전에는 HTML 이 `private, no-cache, no-store` 라 브라우저가 떠난 문서를 보관하지 않았다. 도입 뒤 Vercel 이
 * `public, max-age=0, must-revalidate` 로 내보내(운영 실측), 크롬이 문서를 통째로 보관했다 뒤로가기에 그대로 되살린다
 * (운영에서 외부 사이트로 갔다 뒤로 오자 `pageshow` 의 `persisted === true` · 페이지 JS 변수까지 그대로).
 * 로그인 · 로그아웃 · 가입처럼 문서를 새로 연 이동 뒤에 옛 신분 · 상태의 화면이 뜨지 않도록,
 * 되살린 경우에만 다시 받아 도입 전과 같게 한다. 앱 안 이동의 화면 보존(`<Activity>`)과는 다른 일이다.
 */
export function BfcacheReload() {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);
  return null;
}
