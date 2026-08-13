// NOTE: 'use client' 를 두지 않는다 — 이 모듈은 `redirect` / `permanentRedirect` / `getPathname` 같은
// 서버 사이드 helpers 도 함께 export 하기 때문에, `'use client'` 가 붙으면 `server-navigation.ts`
// 처럼 `import 'server-only'` 인 파일이 이 모듈을 import 할 때 server → client 경계를 침범해
// "redirect is on the client" 런타임 에러가 발생한다.
// Link / useRouter 는 클라이언트 hook (usePathname) 을 호출하므로 별도의 client 모듈
// (`navigation-link.ts`) 로 분리해 re-export 한다. 그렇지 않으면 서버 컴포넌트가 <Link> 를 렌더할 때
// "usePathname is not supported in Server Components" 에러가 발생한다.
//
// `next/link` / `next/navigation` 의 `Link, redirect, useRouter, usePathname` 대신 항상 이 모듈에서
// 가져온다. 호출 시 locale prefix 가 자동으로 붙고, `Link` 의 `locale` prop 으로 다른 언어로 이동할 수도
// 있다. Link / useRouter 는 view transition 방향(`transitionTypes`)을 자동 추론해 주입하는
// enhanced 버전이다 (`navigation-link.ts` 참조).
//
// 서버 컴포넌트 / Server Action 에서의 `redirect` 는 `@/i18n/server-navigation` 을 사용한다.
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

const nav = createNavigation(routing);

// 개별 export — destructure 형식은 TS6133 (unused) 경고가 export 만으로는 해소되지 않음.
export const redirect = nav.redirect;
export const permanentRedirect = nav.permanentRedirect;
export const usePathname = nav.usePathname;
export const getPathname = nav.getPathname;

export { Link, useRouter } from './navigation-link';
export type { EnhancedLinkProps, EnhancedRouter } from './navigation-link';
