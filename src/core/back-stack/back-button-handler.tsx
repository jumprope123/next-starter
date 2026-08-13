'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';
import { clearBackStackOnRouteChange, handlePopstate } from './back-stack';

/**
 * 브라우저 back (popstate) 을 BackStack 에 연결한다.
 * effect-only 컴포넌트이므로 children 을 받지 않는다 — layout 의 sibling 으로 마운트한다.
 *
 * Native WebView 브릿지 연동이 필요하면 (Android 하드웨어 back 을 네이티브가 소유하는 셸 등)
 * 여기서 네이티브 메시지를 수신해 `consumeBack()` 결과(handled 여부)를 응답하는 리스너를
 * 추가한다 — handled=true 면 네이티브는 라우트 pop 을 생략, false 면 `history.back()`/종료를
 * 수행하게 한다. 순수 웹 환경에서는 popstate 경로만으로 충분하다.
 */
export function BackButtonHandler(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 브라우저 back / iOS 스와이프 백 / 프로그래밍 history.back() → popstate
    const onPopState = (event: PopStateEvent): void => {
      handlePopstate(event);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    // pathname 변경 = 라우트 진짜 이동. 모달 상태는 각 소유 컴포넌트가 자체 정리하므로
    // 여기서는 stack/sentinel 만 정리해 더블 처리를 피한다.
    clearBackStackOnRouteChange();
  }, [pathname]);

  return null;
}
