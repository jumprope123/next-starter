'use client';

// Link / useRouter 전용 client 모듈.
//
// `navigation.ts` 는 server-navigation.ts (`'server-only'`) 에서도 redirect / permanentRedirect 를
// import 하기 때문에 `'use client'` 를 달 수 없다. 그러나 우리 useRouter 는 `usePathname` 같은
// 클라이언트 hook 을 호출하므로 서버 컴포넌트에서 렌더되면 "usePathname is not supported in Server Components"
// 런타임 에러가 난다.
// → Link / useRouter 만 이 client 모듈로 분리하고 `navigation.ts` 에서 re-export 한다.
//   server-navigation.ts 는 redirect / permanentRedirect 만 import 하므로 client 모듈은 transitive
//   reference 로만 존재하고 실제 코드는 클라이언트 번들에서만 실행된다.

import { createNavigation } from 'next-intl/navigation';
import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import { getActiveSentinelCount, suppressActiveSentinelPops } from './back-stack-bridge';
import { routing } from './routing';

const nav = createNavigation(routing);

export const Link = nav.Link;
export type LinkProps = ComponentProps<typeof nav.Link>;

type NextRouter = ReturnType<typeof nav.useRouter>;
type PushArgs = Parameters<NextRouter['push']>;
type ReplaceArgs = Parameters<NextRouter['replace']>;
type RouterOptions = NonNullable<PushArgs[1]>;

export type EnhancedRouter = Omit<NextRouter, 'push' | 'replace'> & {
  push: (href: PushArgs[0], options?: RouterOptions) => void;
  replace: (href: ReplaceArgs[0], options?: RouterOptions) => void;
};

/**
 * sentinel pop 의 popstate 가 한 단계라도 끝내 발생하지 않을 때(더 갈 history entry 가 없거나
 * UA 가 흡수) onPop 이 영영 호출되지 않아 리스너가 누수되고 replace 도 실행되지 않는다.
 * 정상 popstate 는 같은 tick 내에 도착하므로, 이 값을 넘기면 stuck 으로 보고 강제 마무리한다.
 */
const SENTINEL_POP_TIMEOUT_MS = 1000;

/**
 * BottomSheet/Dialog 가 history 에 쌓아둔 sentinel entry 위에서 호출된 `router.replace` 를
 * 진짜 replace 처럼 동작시킨다.
 *
 * 문제: sentinel 위에서 그냥 `replaceState` 를 부르면 sentinel entry 만 덮어 사용자에겐 push
 * 처럼 보인다 (뒤로가기 시 원래 페이지가 다시 나옴).
 *
 * 처리: sentinel 개수만큼 `history.back()` 으로 pop 한 뒤, 그 popstate 가 처리된 시점에서
 * `replace` 를 실행한다. back-stack 의 stale 흡수 분기가 추가로 한 칸 더 흡수하지 않도록
 * `suppressNextPopstate(count)` 를 미리 표시한다.
 */
function popSentinelsThenReplace(count: number, doReplace: () => void): void {
  if (typeof window === 'undefined') {
    doReplace();
    return;
  }
  let remaining = count;
  let settled = false;
  let timer = 0;
  const finish = (): void => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    window.removeEventListener('popstate', onPop);
    doReplace();
  };
  const armTimer = (): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(finish, SENTINEL_POP_TIMEOUT_MS);
  };
  function onPop(): void {
    if (settled) return;
    remaining -= 1;
    if (remaining > 0) {
      armTimer();
      window.history.back();
      return;
    }
    finish();
  }
  window.addEventListener('popstate', onPop);
  suppressActiveSentinelPops(count);
  armTimer();
  window.history.back();
}

/**
 * next-intl 라우터에 "sentinel 위에서의 replace" 처리만 덧입힌 래퍼.
 * push / back / forward 는 원본 동작 그대로다.
 */
export function useRouter(): EnhancedRouter {
  const baseRouter = nav.useRouter();

  return useMemo<EnhancedRouter>(() => {
    return {
      ...baseRouter,
      replace: (href, options) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doReplace = (): void => baseRouter.replace(href as any, options as any);
        const sentinelCount = getActiveSentinelCount();
        if (sentinelCount === 0) {
          doReplace();
          return;
        }
        popSentinelsThenReplace(sentinelCount, doReplace);
      },
      // back / forward 는 native history 동작 그대로 위임 — query/hash 보존, history stack 정확.
      back: () => baseRouter.back(),
      forward: () => baseRouter.forward(),
    };
  }, [baseRouter]);
}
