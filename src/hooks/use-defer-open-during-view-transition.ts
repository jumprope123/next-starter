'use client';

import { useEffect, useState } from 'react';

import { waitForViewTransitionEnd } from '@/utils/view-transition';

/**
 * controlled `open` prop 을 View Transition 종료 시점까지 지연.
 *
 * Why: 페이지 진입 직후 effect 가 시트/모달을 자동으로 여는 흐름에서, ViewTransition pseudo
 * snapshot 이 root 컨텐츠 위로 합성되어 막 깔린 dim 위로 페이지가 비쳐 보인다 — 전환이
 * 끝난 뒤에 dim 이 올라오게 만들면 자연스럽다.
 *
 * How to apply: BottomSheet / Drawer 등 portal 기반 overlay 의 controlled open prop 을
 * 본 hook 으로 한 번 통과시키면 된다. open=false 로의 전환은 즉시 반영하고, open=true 만 지연한다.
 */
export function useDeferOpenDuringViewTransition(open: boolean | undefined): boolean | undefined {
  const [deferred, setDeferred] = useState<boolean | undefined>(open);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 닫힘은 즉시 반영(view-transition 지연 불필요, 의도적)
      setDeferred(open);
      return;
    }

    let cancelled = false;
    void waitForViewTransitionEnd().then(() => {
      if (!cancelled) setDeferred(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return deferred;
}
