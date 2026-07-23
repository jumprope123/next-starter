<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is
outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

---

# Agent Guide (template-next-single)

본 문서는 이 보일러플레이트 (또는 이를 fork 해 시작한 신규 프로젝트) 에서 작업하는 코드 에이전트를 위한 안내입니다. 새 프로젝트를 시작할 때 **설정 / 유틸 / 훅을 새로 만들 필요 없이 곧바로 기능 개발** 에 들어갈 수 있도록, 자주 쓰이는 모든 것을 미리 마련해 두었습니다.

## 0. Always-do

1. **Next.js 관련 작업 전에는 반드시 `node_modules/next/dist/docs/` 에서 해당 항목 문서를 읽는다.** 학습 데이터는 오래되었을 수 있다.
2. **새 파일을 만들기 전에 `src/utils`, `src/hooks`, `src/components`, `src/stores`, `src/providers` 의 `index.ts` 재수출을 먼저 확인한다.** 동일/유사 기능이 이미 있으면 그것을 사용한다.
3. **alias 를 일관되게 사용한다.** `@/...` → `src/`, `#/...` → `public/`. 상대 경로는 같은 기능 폴더 내부에서만 허용한다.
4. **기능을 추가하면 해당 폴더의 `index.ts` 에 export 를 잊지 않는다.**
5. **Server / Client 컴포넌트 경계를 의식한다.** 클라이언트 훅(`useState`, `useEffect`, zustand, react-query) 을 쓰는 파일은 첫 줄에 `'use client'`.
6. **i18n 라우팅 / redirect 는 `@/i18n/navigation` 또는 `@/i18n/server-navigation` 에서만 import.** `next/link`, `next/navigation` 직접 사용 금지.
7. **className 합성은 항상 `cn(...)` 을 사용한다.** (`@/utils/class.ts`)

## 1. 한눈에

| 항목 | 값 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router, Turbopack) + React 19 + React Compiler |
| 언어 | TypeScript 5, `strict: true`, `noUncheckedIndexedAccess: true` |
| 스타일 | Tailwind CSS 4 (`@tailwindcss/postcss`) + `cn(clsx + tailwind-merge)` + `tailwindcss-safe-area` |
| 상태 | zustand 5 (모든 store 는 `'use client'`) |
| 데이터 | `@tanstack/react-query` + `@lukemorales/query-key-factory` + `return-fetch` 기반 `fetchExtended` / `fetcher` (with `ApiError`) |
| 폼 | `react-hook-form` + `zod` (v4) + `@hookform/resolvers` |
| i18n | `next-intl` 4 (`localePrefix: 'as-needed'`, ko / en) |
| URL 상태 | `nuqs` |
| 토스트 | `react-hot-toast` |
| 모션 | framer-motion + GSAP (ScrollTrigger 1 회 등록) |
| 품질 | ESLint(`eslint-config-next` + `no-console: warn`) / Prettier(`prettier-plugin-tailwindcss`) / husky pre-commit (lint-staged) |

런타임: Node.js `>=24.12.0 <25.0.0`, pnpm `10.30.3` (`engine-strict=true`)

## 2. 명령어

```bash
pnpm install          # 의존성 설치 + husky pre-commit 활성화
pnpm dev              # 개발 서버
pnpm dev:staging      # .env.staging 을 로드한 개발 서버
pnpm build            # 프로덕션 빌드
pnpm start            # 빌드 결과 실행
pnpm lint             # ESLint
pnpm check-types      # next typegen + tsc --noEmit
pnpm format           # Prettier
pnpm clean            # .next / tsconfig.tsbuildinfo 제거
```

## 3. 디렉터리 구조

```
src/
├── actions/        'use server' Server Actions (cookie, time)
├── app/            App Router
│   ├── [locale]/   모든 페이지 — root layout 도 여기 둔다
│   │   ├── _components/
│   │   ├── error.tsx       세그먼트 에러 폴백
│   │   ├── layout.tsx      root layout (Provider 셸 포함)
│   │   ├── loading.tsx     Suspense 폴백
│   │   ├── not-found.tsx   404 폴백
│   │   └── page.tsx        데모 랜딩 페이지
│   ├── api/ping/   헬스체크 Route Handler (데모)
│   ├── global-error.tsx    루트 레이아웃 자체에서 에러가 났을 때의 글로벌 폴백
│   ├── robots.ts
│   └── sitemap.ts
├── components/     재사용 컴포넌트
├── constants/      쿠키 이름 / 라우트 경로 등 정적 상수
├── core/           인프라 레벨 (fetchExtended, fetcher, ApiError, createFormData, demo API)
├── hooks/          커스텀 훅
├── i18n/           next-intl 설정 (routing, navigation, server-navigation, useAppTranslation, getServerAppTranslation)
├── messages/       번역 JSON
├── providers/      AppShellProviders, QueryProvider, query-key 팩토리
├── proxy.ts        Next.js 16 미들웨어 (next-intl 라우팅)
├── stores/         zustand store (media, mobile, settings)
├── styles/         전역 CSS
├── types/          전역 타입 / 환경 변수 선언
└── utils/          순수 유틸리티
```

alias: `@/*` → `./src/*`, `#/*` → `./public/*`

## 4. 자주 쓰는 유틸 / 훅 / 컴포넌트 cheat sheet

### Utils (`@/utils`)

| 모듈 | 주요 export |
| --- | --- |
| `array` | `shuffle`, `getChunkedArray`, `filterDuplicateItem`, `deepCopy` |
| `boolean` | `isTrue` |
| `class` | `cn` (clsx + tailwind-merge) |
| `clipboard` | `copyToClipboard` |
| `date` | `secondsToMinutes`, `getElapsedTime` |
| `device` | `isTouchDevice` |
| `download` | `downloadFile` |
| `element` | `getHighlightedText` |
| `env` | `isServer`, `isClient`, `isDevelopment`, `isProduction`, `isTest` |
| `format` | `toNumber`, `formatNumber`, `joinValueUnit`, `formatPhoneNumber`, `phoneNumberUtil`, `formatDate`, `calculateDday` |
| `keyboard` | `isEnter` (IME 대응) |
| `meta` | `staticMetadata`, `shareCurrentPage` |
| `next` | `allowCors` (Route Handler CORS 래퍼) |
| `number` | `clamp`, `range`, `lerp` |
| `object` | `compareAllKeys`, `hasAllValues`, `withSubComponents`, `pick`, `omit`, `removeUndefined` |
| `promise` | `getFulfilledResults`, `getRejectedResults`, `sleep`, `withTimeout`, `retry` |
| `query` | `isValidQuery`, `addToQuery`, `removeFromQuery`, `createHrefQuery` |
| `ref` | `mergeRefs` |
| `storage` | `storage` (localStorage), `sessionStorage` (둘 다 SSR-safe + JSON 자동 직렬화) |
| `type` | `assertNever`, `isObject`, `isNotNullish` |

### Hooks (`@/hooks`)

| 훅 | 역할 |
| --- | --- |
| `useMedia` | Tailwind `sm/md/lg/xl` 매칭 → zustand 동기화 |
| `useContainer` | 와이드 화면(>1920px) 좌우 균등 padding 계산 |
| `useFocusScroll` | 가로 스크롤 컨테이너에서 특정 자식 위치로 스크롤 |
| `useOnClickOutside` | ref 외부 mouseup 감지 |
| `useScrollPage` | 가로 캐러셀의 페이지 인덱스 추적 / 이동 |
| `useScrollFadeIn` | GSAP ScrollTrigger 페이드 인 |
| `useGrabSlide` | 마우스 드래그로 가로 스크롤 조작 |
| `useAllSearchParams` | `URLSearchParams` → 객체 변환 |
| `useSearchQuery` | URL 쿼리 읽기 / 쓰기 / 리셋 |
| `useServerNow` | 서버 시간 기준 1 초 단위 `now` 갱신 |
| `useDisclosure` | 모달/시트/드롭다운 토글 (`isOpen / open / close / toggle`) |
| `useToggle` | 단순 boolean 토글 (`[value, toggle, set]`) |
| `useMounted` | hydration 이후 마운트 여부 |
| `useDebouncedValue` | 입력 값을 디바운스해 안정적인 값 반환 |
| `useCopyToClipboard` | 복사 + `isCopied` 피드백 상태 |

### Components (`@/components`)

| 컴포넌트 | 역할 |
| --- | --- |
| `Polyfill` | core-js 폴리필을 클라이언트 번들에 1 회 주입 |
| `MobileDetector` | UA 분석 결과를 `useMobileStore` 에 기록 |
| `Portal` | `#next-app-portal` 노드로 children 포털링 (SSR off) |
| `NextImage` / `NextImage.Protected` | `next/image` 래퍼 (비율 / fallback / 우클릭 보호) |
| `AnimatedTimer` | 두 자리 숫자 슬라이드 카운터 (framer-motion) |
| `TextMotion` | 텍스트 순환 + 글자 스태거 모션 |
| `Skeleton` | `react-loading-skeleton` 얇은 래퍼 |
| `ClientOnly` | hydration 부조화 방지 (마운트 전에는 fallback 렌더) |
| `ErrorBoundary` | 위젯 단위 에러 폴백 (페이지 단위는 `app/.../error.tsx`) |

### Stores (`@/stores`)

| Store | 설명 |
| --- | --- |
| `useMediaStore` | `sm / md / lg / xl` boolean. `useMedia` 훅이 갱신 |
| `useMobileStore` | `isMobile / isAndroid / isIOS / isReady`. `<MobileDetector />` 가 채움 |
| `useLocalSettingsStore` | localStorage 영구 저장 (`isDarkMode` 예시) |
| `useSessionSettingsStore` | sessionStorage 보존 (`isLaunched` 예시) |

### Core / Actions

- `core/fetch.ts` — `fetchExtended` (4xx/5xx 자동 `ApiError` throw), `fetcher<T>` (`/proxy/app` 자동 prefix + JSON 파싱), `createFormData`, `ApiError` 클래스.
- `core/demo` — `getPing` (`/api/ping`) 데모. 새 프로젝트에서 가장 먼저 지우거나 교체할 곳.
- `actions/cookie.actions.ts` — `setCookieAction / getCookieAction / deleteCookieAction` (`httpOnly`, JSON 자동 직렬화).
- `actions/time.actions.ts` — `getServerTime`. `useServerNow` 훅이 사용.

### Providers

```tsx
<NextIntlClientProvider>           // [locale]/layout.tsx
  <AppShellProviders>              // app-shell-providers.tsx
    <QueryProvider>                // QueryClient lazy init (SSR/CSR 격리)
      <NuqsAdapter>{children}</NuqsAdapter>
      <Toaster />
    </QueryProvider>
  </AppShellProviders>
</NextIntlClientProvider>
```

새 도메인 쿼리 키는 `src/providers/query-provider/query-keys/<domain>-query-keys.ts` 에 `createQueryKeys` 로 추가하고, 같은 폴더의 `index.ts` 의 `mergeQueryKeys(...)` 인자에 등록한다. 사용 측은 `import { queries } from '@/providers'` → `useQuery(queries.<domain>.<query>())`.

### i18n

- 메시지: `getAppMessages(locale)` 한 곳에서 관리. JSON 직접 import 금지.
- 페이지 경로: 항상 `app/[locale]/...` 아래에 둔다 — root `app/layout.tsx` 는 두지 않는다.
- 번역 호출 (`fallback` / `values` 지원):

```tsx
const t = useAppTranslation();
t('home.title', { fallback: '홈' });
t('home.greeting', { fallback: '안녕하세요, {name}', values: { name } });

// 서버 (RSC / Server Action)
const t = await getServerAppTranslation();
t('home.title', { fallback: '홈' });
```

- Navigation 은 `next/link` / `next/navigation` 대신 항상 다음을 쓴다:

```ts
import { Link, useRouter, usePathname } from '@/i18n/navigation';            // 클라이언트
import { redirect, permanentRedirect } from '@/i18n/server-navigation';      // 서버 (await 필수)
```

- 로케일 추가: `routing.ts` 의 `locales` 에 코드 추가 → `messages/<code>.json` 작성 → `messages.ts` 의 `messagesByLocale` 에 등록.

## 5. 코드 스타일

- `strict: true`, `any` 회피. 불가피하면 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 주석으로 격리.
- 타입 임포트는 `import type` 또는 inline `type` 키워드 사용.
- 컴포넌트/훅 props 는 `Readonly<Props>` 로 받는다.
- `'use client'` 디렉티브는 파일 첫 줄.
- `export default` 는 Next.js 가 요구하는 `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `loading.tsx`, `global-error.tsx`, `route.ts` 등에서만 사용. 그 외는 named export.
- className 합성은 항상 `cn(...)`. Tailwind 충돌은 `tailwind-merge` 가 자동 정리.
- Prettier: `printWidth: 120`, `singleQuote: true`, `trailingComma: 'es5'`, `semi: true`.

## 6. 검증 절차

작업이 끝나면 반드시 아래 순서로 확인한다.

1. 변경된 파일을 대상으로 `eslint`.
2. `pnpm check-types` — Next 타입 생성 + `tsc --noEmit`.
3. 런타임 / export 가 변경되었으면 `pnpm build` 까지 한 번 더.

## 7. 새 프로젝트로 옮길 때 체크리스트

1. `package.json` 의 `name` 을 변경.
2. `src/app/[locale]/layout.tsx` 의 `metadata` (`title`, `description`) 와 `viewport` 갱신.
3. `src/app/robots.ts`, `src/app/sitemap.ts` 정책 / 도메인 (`NEXT_PUBLIC_SITE_URL`) 검토.
4. `vercel.json` 의 `regions` 확인 (기본값 `icn1`).
5. `src/app/[locale]/page.tsx` 와 `src/app/[locale]/_components/template-playground.tsx` 는 데모 — 삭제 / 교체.
6. `src/core/demo/` 와 `src/app/api/ping/` 는 데모 — 새 백엔드를 붙일 때 정리.
7. `src/messages/*.json` 의 `template.*` 키를 비우고 실제 카탈로그를 채운다 (`common.*` 키는 보존 권장).
8. `src/constants/cookie.constants.ts` / `route-path.constants.ts` 를 프로젝트 도메인에 맞게 채운다.
9. `src/types/environments.d.ts` 의 `ProcessEnv` 에 새 환경 변수 타입을 등록한다.
10. 사용하지 않는 컴포넌트 / 훅(`useGrabSlide`, `useScrollFadeIn`, `TextMotion`, `AnimatedTimer` 등) 은 폴더의 `index.ts` 에서 export 만 빼는 식으로 "비활성화" 처리하여, 보일러플레이트의 학습 자료 가치를 보존한다.
11. 이 `AGENTS.md` 는 그대로 두고, 프로젝트 고유 규칙은 파일 끝에 `## Project-specific notes` 섹션으로 추가한다.
