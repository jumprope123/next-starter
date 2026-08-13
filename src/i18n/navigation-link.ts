'use client';

// Link / useRouter 전용 client 모듈.
//
// `navigation.ts` 는 server-navigation.ts (`'server-only'`) 에서도 redirect / permanentRedirect 를
// import 하기 때문에 `'use client'` 를 달 수 없다. 그러나 우리 Link / useRouter 는 `usePathname` 같은
// 클라이언트 hook 을 호출하므로 서버 컴포넌트에서 렌더되면 "usePathname is not supported in Server Components"
// 런타임 에러가 난다.
// → Link / useRouter 만 이 client 모듈로 분리하고 `navigation.ts` 에서 re-export 한다.
//   server-navigation.ts 는 redirect / permanentRedirect 만 import 하므로 client 모듈은 transitive
//   reference 로만 존재하고 실제 코드는 클라이언트 번들에서만 실행된다.

import { createNavigation } from 'next-intl/navigation';
import { createElement, forwardRef, useMemo, useRef } from 'react';
import type { ComponentProps, ReactNode, Ref } from 'react';

import { getActiveSentinelCount, suppressActiveSentinelPops } from './back-stack-bridge';
import { isModalRoute } from './modal-route-bridge';
import { routing } from './routing';
import { computeNavTransitionType, extractHrefPath, normalizePath } from './transition-direction';
import { getTransitionSuppression } from './transition-suppressor-bridge';

const nav = createNavigation(routing);
const usePathname = nav.usePathname;

type BaseLinkProps = ComponentProps<typeof nav.Link>;
type TransitionTypesInput = string[] | undefined;

export type EnhancedLinkProps = Omit<BaseLinkProps, 'transitionTypes'> & {
  /** undefined → 자동 추론, [] → transition 미적용 */
  transitionTypes?: TransitionTypesInput;
};

function resolveTypes(
  currentPath: string,
  href: BaseLinkProps['href'],
  explicit: TransitionTypesInput,
  options?: { isReplace?: boolean }
): TransitionTypesInput {
  if (explicit !== undefined) return explicit;
  // pathname 미명시 (query/hash 만 변경) 인 경우 currentPath 를 fallback 으로 넘겨 같은 페이지 유지로 처리.
  const targetPath = extractHrefPath(href, currentPath);
  const normalizedCurrent = normalizePath(currentPath);
  const normalizedTarget = normalizePath(targetPath);
  // 출발/도착 중 하나라도 modal route 면 transition 끈다 — Portal modal 은 페이지 슬라이드가 아닌
  // 즉시 표시가 자연스럽다. 앱이 `registerModalRouteMatcher` 로 등록해 둔 패턴으로 판정.
  if (isModalRoute(normalizedCurrent) || isModalRoute(normalizedTarget)) {
    return [];
  }
  // 특정 라우트 쌍 사이의 이동이면 transition 을 끄거나 crossfade 로 바꾼다. 앱이
  // `registerTransitionSuppressor` 로 등록한 쌍 매처로 판정 — 바깥에서 건너오는 이동에는 영향이 없다.
  const suppression = getTransitionSuppression(normalizedCurrent, normalizedTarget);
  if (suppression === 'none') return [];
  if (suppression === 'fade') return ['nav-fade'];
  const inferred = computeNavTransitionType(currentPath, targetPath, options);
  return inferred ? [inferred] : undefined;
}

function LinkImpl({ transitionTypes: explicit, ...rest }: EnhancedLinkProps, ref: Ref<HTMLAnchorElement>): ReactNode {
  const pathname = usePathname();
  // `<Link replace>` 는 history.replaceState 로 동작하므로 router.replace 와 동일하게 취급한다.
  const resolved = resolveTypes(pathname, rest.href, explicit, { isReplace: rest.replace === true });
  // eslint-disable-next-line react-hooks/refs -- forwardRef 로 전달받은 ref 를 그대로 하위에 forward(의도적)
  return createElement(nav.Link, {
    ...rest,
    ref,
    ...(resolved && resolved.length > 0 ? { transitionTypes: resolved } : {}),
  } as BaseLinkProps);
}

export const Link = forwardRef(LinkImpl) as unknown as (
  props: EnhancedLinkProps & { ref?: Ref<HTMLAnchorElement> }
) => ReactNode;

type NextRouter = ReturnType<typeof nav.useRouter>;
type PushArgs = Parameters<NextRouter['push']>;
type ReplaceArgs = Parameters<NextRouter['replace']>;
type RouterOptions = NonNullable<PushArgs[1]> & { transitionTypes?: TransitionTypesInput };

export type EnhancedRouter = Omit<NextRouter, 'push' | 'replace'> & {
  push: (href: PushArgs[0], options?: RouterOptions) => void;
  replace: (href: ReplaceArgs[0], options?: RouterOptions) => void;
};

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
 *
 * popstate-view-transition 의 인수 로직은 `destPath === lastCommittedPath` 조건으로 자동으로
 * skip 되므로 (URL 변경 없는 sentinel pop) 별도 처리 불필요.
 */
/**
 * sentinel pop 의 popstate 가 한 단계라도 끝내 발생하지 않을 때(더 갈 history entry 가 없거나
 * UA 가 흡수) onPop 이 영영 호출되지 않아 리스너가 누수되고 replace 도 실행되지 않는다.
 * 정상 popstate 는 같은 tick 내에 도착하므로, 이 값을 넘기면 stuck 으로 보고 강제 마무리한다.
 */
const SENTINEL_POP_TIMEOUT_MS = 1000;

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

export function useRouter(): EnhancedRouter {
  const baseRouter = nav.useRouter();
  const pathname = usePathname();

  // pathname 을 ref 로 추적해 useMemo deps 에서 제외한다. deps 에 pathname 을 두면 페이지 전환마다
  // EnhancedRouter 객체가 새로 만들어지고, useRouter() 를 호출한 모든 클라이언트 컴포넌트에서
  // 이를 의존성으로 가진 useEffect / useMemo 가 불필요하게 재실행된다. push/replace 는 사용자가
  // 인터랙션할 시점 (= render commit 이후) 에 호출되므로 ref.current 는 항상 최신 pathname 을 가진다.
  const pathnameRef = useRef(pathname);
  // eslint-disable-next-line react-hooks/refs -- 렌더마다 최신 pathname 을 ref 에 보관(콜백에서 stale 회피, 위 주석 참고)
  pathnameRef.current = pathname;

  return useMemo<EnhancedRouter>(() => {
    const enrich = (
      options: RouterOptions | undefined,
      href: unknown,
      kind: 'push' | 'replace'
    ): RouterOptions | undefined => {
      const explicit = options?.transitionTypes;
      const resolved = resolveTypes(pathnameRef.current, href as BaseLinkProps['href'], explicit, {
        isReplace: kind === 'replace',
      });
      if (!resolved || resolved.length === 0) {
        if (!options) return undefined;
        const withoutTypes: RouterOptions = { ...options };
        delete withoutTypes.transitionTypes;
        return Object.keys(withoutTypes).length > 0 ? withoutTypes : undefined;
      }
      return { ...(options ?? {}), transitionTypes: resolved };
    };

    return {
      ...baseRouter,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      push: (href, options) => baseRouter.push(href as any, enrich(options, href, 'push') as any),
      replace: (href, options) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedOptions = enrich(options, href, 'replace') as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doReplace = (): void => baseRouter.replace(href as any, enrichedOptions);
        const sentinelCount = getActiveSentinelCount();
        if (sentinelCount === 0) {
          doReplace();
          return;
        }
        popSentinelsThenReplace(sentinelCount, doReplace);
      },
      // back / forward 는 native history 동작 그대로 위임 — query/hash 보존, history stack 정확.
      // popstate 전환 애니메이션은 `@/core/view-transition` 의 popstate-view-transition 이 담당한다:
      // popstate 를 가로채 `document.startViewTransition` 을 직접 구동하므로, 여기서 native history 에
      // 위임해도 브라우저 back/forward 버튼·스와이프와 동일하게 nav-back/nav-forward 슬라이드가 적용된다.
      back: () => baseRouter.back(),
      forward: () => baseRouter.forward(),
    };
  }, [baseRouter]);
}
