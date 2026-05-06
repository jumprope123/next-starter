'use client';

import { useLayoutEffect } from 'react';
import MobileDetect from 'mobile-detect';
import { useMobileStore } from '@/stores';

/**
 * 클라이언트 마운트 직후 User-Agent 를 분석해 디바이스 종류를 `useMobileStore` 에 기록한다.
 *
 * - `mobile()` 매칭 결과 → `isMobile`
 * - OS 가 `AndroidOS` → `isAndroid`
 * - OS 가 `iOS` 또는 `iPadOS` → `isIOS`
 * - 분석이 끝난 시점에 `isReady` 가 `true` 로 바뀌어, 그 전에는 디바이스 분기 렌더링을 보류할 수 있다.
 *
 * 렌더 트리에는 아무것도 그리지 않는 사이드이펙트 전용 컴포넌트이므로, 보통 루트 layout 의 최상단에
 * 한 번만 마운트한다.
 */
export function MobileDetector() {
  const { setIsMobile, setIsAndroid, setIsIOS, setIsReady } = useMobileStore();

  useLayoutEffect(() => {
    const userAgent = new MobileDetect(window.navigator.userAgent);
    setIsMobile(!!userAgent.mobile());
    setIsAndroid(userAgent.os() === 'AndroidOS');
    setIsIOS(userAgent.os() === 'iOS' || userAgent.os() === 'iPadOS');
    setIsReady(true);
  }, [setIsMobile, setIsAndroid, setIsIOS, setIsReady]);

  return null;
}
