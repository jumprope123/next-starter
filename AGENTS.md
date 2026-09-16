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
6. **i18n 라우팅 / redirect 는 `@/i18n/navigation` 또는 `@/i18n/server-navigation` 에서만 import.** `next/link`, `next/navigation` 직접 사용 금지. 예외는 next-intl 이 감싸지 않는 `notFound` / `useSearchParams` 뿐이며, 해당 import 에는 이유를 주석으로 남긴다. (`useRouter` 는 back-stack sentinel 정리까지 해주므로 우회하면 바텀시트 뒤로가기가 깨진다.)
7. **className 합성은 항상 `cn(...)` 을 사용한다.** (`@/utils/class.ts`)

## 1. 한눈에

| 항목       | 값                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 프레임워크 | Next.js 16 (App Router, Turbopack) + React 19 + React Compiler                                                                 |
| 언어       | TypeScript 5, `strict: true`, `noUncheckedIndexedAccess: true`                                                                 |
| 스타일     | Tailwind CSS 4 (`@tailwindcss/postcss`) + `cn(clsx + tailwind-merge)` + `tailwindcss-safe-area`                                |
| 상태       | zustand 5 (모든 store 는 `'use client'`)                                                                                       |
| 데이터     | `@tanstack/react-query` + `@lukemorales/query-key-factory` + `return-fetch` 기반 `fetchExtended` / `fetcher` (with `ApiError`) |
| 폼         | `react-hook-form` + `zod` (v4) + `@hookform/resolvers`                                                                         |
| i18n       | `next-intl` 4 (`localePrefix: 'as-needed'`, ko / en)                                                                           |
| URL 상태   | `nuqs`                                                                                                                         |
| 토스트     | `react-hot-toast`                                                                                                              |
| 모션       | framer-motion + GSAP (ScrollTrigger 1 회 등록)                                                                                 |
| 품질       | ESLint(`eslint-config-next` + `no-console: warn`) / Prettier(`prettier-plugin-tailwindcss`) / husky pre-commit (lint-staged)   |

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
pnpm format           # Prettier (.prettierignore 로 lockfile / package.json 제외)
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
├── core/           인프라 레벨 (fetchExtended, fetcher, ApiError, createFormData, demo API,
│                   back-stack 엔진)
├── hooks/          커스텀 훅
├── i18n/           next-intl 설정 (routing, navigation, server-navigation, useAppTranslation, getServerAppTranslation)
│                   + back-stack DI 브리지 (back-stack-bridge)
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

| 모듈             | 주요 export                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `array`          | `shuffle`, `getChunkedArray`, `filterDuplicateItem`, `deepCopy`                                                    |
| `boolean`        | `isTrue`                                                                                                           |
| `class`          | `cn` (clsx + tailwind-merge)                                                                                       |
| `clipboard`      | `copyToClipboard`                                                                                                  |
| `date`           | `secondsToMinutes`, `getElapsedTime`                                                                               |
| `device`         | `isTouchDevice`                                                                                                    |
| `download`       | `downloadFile`                                                                                                     |
| `element`        | `getHighlightedText`                                                                                               |
| `env`            | `isServer`, `isClient`, `isDevelopment`, `isProduction`, `isTest`                                                  |
| `format`         | `toNumber`, `formatNumber`, `joinValueUnit`, `formatPhoneNumber`, `phoneNumberUtil`, `formatDate`, `calculateDday` |
| `keyboard`       | `isEnter` (IME 대응)                                                                                               |
| `meta`           | `staticMetadata`, `shareCurrentPage`                                                                               |
| `next`           | `allowCors` (Route Handler CORS 래퍼)                                                                              |
| `number`         | `clamp`, `range`, `lerp`                                                                                           |
| `object`         | `compareAllKeys`, `hasAllValues`, `withSubComponents`, `pick`, `omit`, `removeUndefined`                           |
| `promise`        | `getFulfilledResults`, `getRejectedResults`, `sleep`, `withTimeout`, `retry`                                       |
| `query`          | `isValidQuery`, `addToQuery`, `removeFromQuery`, `createHrefQuery`                                                 |
| `ref`            | `mergeRefs`                                                                                                        |
| `storage`        | `storage` (localStorage), `sessionStorage` (둘 다 SSR-safe + JSON 자동 직렬화)                                     |
| `overlay-motion` | `SHEET_EXIT_DURATION_MS`, `DIALOG_EXIT_DURATION_MS`, `afterNextPaint` (오버레이 언마운트 타이머 — CSS 변수와 짝)   |
| `type`           | `assertNever`, `isObject`, `isNotNullish`                                                                          |

### Hooks (`@/hooks`)

| 훅                    | 역할                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `useMedia`            | Tailwind `sm/md/lg/xl` 매칭 → zustand 동기화                                                                                                |
| `useContainer`        | 와이드 화면(>1920px) 좌우 균등 padding 계산                                                                                                 |
| `useFocusScroll`      | 가로 스크롤 컨테이너에서 특정 자식 위치로 스크롤                                                                                            |
| `useOnClickOutside`   | ref 외부 mouseup 감지                                                                                                                       |
| `useScrollPage`       | 가로 캐러셀의 페이지 인덱스 추적 / 이동                                                                                                     |
| `useScrollFadeIn`     | GSAP ScrollTrigger 페이드 인                                                                                                                |
| `useGrabSlide`        | 마우스 드래그로 가로 스크롤 조작                                                                                                            |
| `useAllSearchParams`  | `URLSearchParams` → 객체 변환                                                                                                               |
| `useSearchQuery`      | URL 쿼리 읽기 / 쓰기 / 리셋                                                                                                                 |
| `useServerNow`        | 서버 시간 기준 1 초 단위 `now` 갱신                                                                                                         |
| `useDisclosure`       | 모달/시트/드롭다운 토글 (`isOpen / open / close / toggle`)                                                                                  |
| `useToggle`           | 단순 boolean 토글 (`[value, toggle, set]`)                                                                                                  |
| `useMounted`          | hydration 이후 마운트 여부                                                                                                                  |
| `useDebouncedValue`   | 입력 값을 디바운스해 안정적인 값 반환                                                                                                       |
| `useCopyToClipboard`  | 복사 + `isCopied` 피드백 상태                                                                                                               |
| `useDismissOnBack`    | **뒤로가기(브라우저/안드 back)로 모달·바텀시트 닫기.** `useDismissOnBack(isOpen, close)` — history sentinel 자동 관리 (`@/core` back-stack) |
| `useScrollLock`       | body 스크롤 락 — 참조 카운팅 + `body.app-scroll-locked` 클래스 토글 (3rd-party inline overflow 와 직교)                                     |
| `useSettingsHydrated` | 영속 store(zustand persist) 복원 완료 여부 — 기본값→복원값 전환을 감추고 싶을 때 게이트로 쓴다                                              |

### Components (`@/components`)

| 컴포넌트                            | 역할                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Polyfill`                          | core-js 폴리필 주입 — **선별 import**. 전체 import(`core-js/actual`)는 gzip +80KB 라 되돌리지 말 것                                      |
| `MobileDetector`                    | UA 분석 결과를 `useMobileStore` 에 기록                                                                                                  |
| `Portal`                            | `#next-app-portal` 노드로 children 포털링 (SSR off)                                                                                      |
| `NextImage` / `NextImage.Protected` | `next/image` 래퍼 (비율 / fallback / 우클릭 보호)                                                                                        |
| `AnimatedTimer`                     | 두 자리 숫자 슬라이드 카운터 (framer-motion)                                                                                             |
| `TextMotion`                        | 텍스트 순환 + 글자 스태거 모션                                                                                                           |
| `Skeleton`                          | `react-loading-skeleton` 얇은 래퍼                                                                                                       |
| `ClientOnly`                        | hydration 부조화 방지 (마운트 전에는 fallback 렌더)                                                                                      |
| `ErrorBoundary`                     | 위젯 단위 에러 폴백 (페이지 단위는 `app/.../error.tsx`)                                                                                  |
| `PressFeedback`                     | 모바일 시스템 앱 스타일 눌림 피드백 (layout 마운트 완료 — 옵트아웃 `data-press-ignore`/`data-press-no-tint`, 옵트인 `data-press-target`) |
| `CustomPointer` | iPadOS 트랙패드 스타일 커스텀 포인터. **layout 에 마운트하지 않음**(기본 커서 유지) — 쓰려면 layout 에서 마운트 |

### Stores (`@/stores`)

| Store                     | 설명                                                                   |
| ------------------------- | ---------------------------------------------------------------------- |
| `useMediaStore`           | `sm / md / lg / xl` boolean. `useMedia` 훅이 갱신                      |
| `useMobileStore`          | `isMobile / isAndroid / isIOS / isReady`. `<MobileDetector />` 가 채움 |
| `useLocalSettingsStore`   | localStorage 영구 저장 (`isDarkMode` 예시)                             |
| `useSessionSettingsStore` | sessionStorage 보존 (`isLaunched` 예시)                                |

> 영속 store 두 개는 `skipHydration: true` 이고 `<SettingsHydrator />` (layout 마운트 완료) 가 첫 페인트
> 이후에 복원한다. persist 의 기본 동작(모듈 평가 시점 동기 복원)은 SSR 결과와 클라이언트 첫 렌더를
> 어긋나게 해 **hydration mismatch** 를 일으키므로 되돌리지 말 것.

### Core / Actions

- `core/fetch.ts` — `fetchExtended` (4xx/5xx 자동 `ApiError` throw), `fetcher<T>` (`/proxy/app` 자동 prefix + JSON 파싱), `createFormData`, `ApiError` 클래스. **`fetcher` 의 `data` 는 `T | null`** — 204 / 비-JSON 응답에서는 null 이므로 호출부에서 반드시 확인한다.
- `core/back-stack` — 뒤로가기 모달 닫기 엔진. `pushBackHandler` (history sentinel + onClose 등록), `BackButtonHandler` (layout 마운트 완료), `isCurrentEntrySentinel` (sentinel 위에서는 push 대신 replace), `consumeBack`/`setBackFallback` (네이티브 WebView back 브릿지용). `history-entry-index.ts` 가 `pushState/replaceState` 에 위치 인덱스를 스탬프해 sentinel 판정과 흡수 방향을 정확히 한다. 소비자는 보통 `useDismissOnBack` 훅만 쓰면 된다.

- `core/demo` — `getPing` (`/api/ping`) 데모. 새 프로젝트에서 가장 먼저 지우거나 교체할 곳.
- `actions/cookie.actions.ts` — `setCookieAction / getCookieAction / deleteCookieAction` (`httpOnly`, JSON 자동 직렬화).
- `actions/time.actions.ts` — `getServerTime`. `useServerNow` 훅이 사용.

> **페이지 전환 애니메이션은 이 보일러플레이트에 없다.** 커스텀 View Transition 엔진은 OOM / 성능
> 이슈로 제거되었다 (`core/view-transition`, `styles/view-transitions.css`, `i18n/transition-*`,
> `i18n/modal-route*`). 전환이 필요하면 Next.js 가 공식 지원하는 기능으로 붙인다.
>
> **단, 공식 방식(React `<ViewTransition>` + `<Link transitionTypes>`)도 한 번 시도했다가 되돌렸다**
> (2026-09-16, 커밋 8f7b1cf → revert 95d2a40). 방향 슬라이드는 동작했지만 **공유 요소 morph 가
> 될 때도 있고 안 될 때도 있었다.** 계측해 보니 네비게이션 transition 과 도착 콘텐츠 렌더가
> 일관되게 ~430ms 벌어져, `frame-*` view-transition-name 이 양쪽에 찍히지 않아 공유 쌍 자체가
> 성립하지 않았다(React 가 자동 이름 `_t_0_` 만 부여). `prefetch={true}` + `generateStaticParams`
> 로 라우트를 `ƒ` → `●` 로 바꿔 봤지만 이번엔 링크 클릭이 하드 네비게이션으로 떨어졌다.
> 다시 시도한다면 **도착 페이지가 네비게이션 commit 과 같은 렌더에 마운트되는지** 부터 확인할 것
> (`[locale]/layout.tsx` 의 fallback 없는 `<Suspense>{children}</Suspense>` 가 유력한 용의자다 —
> 네비게이션을 콘텐츠 없이 먼저 커밋시킨다). 패턴 가이드는 `npx skills add vercel-labs/agent-skills
> --skill vercel-react-view-transitions`.

### Styles (`@/styles`) — 앱형(웹뷰) UX CSS 시스템

`globals.css` 가 단일 진입점 (partial 끼리 서로 import 하지 않는다). 주요 시스템:

- **safe-area 게이트** (`safe-area.css` + `tailwindcss-safe-area` 플러그인): 네이티브 WebView 가 첫 진입 URL 에
  `?safearea=1` 을 실으면 미들웨어(proxy.ts)가 쿠키로 전환하고 layout 이 `<html>` 에 `.app-safe-area` 를 SSR
  주입한다. 게이트 OFF(순수 브라우저)면 `--twsa-safe-area-inset-*` 가 0 으로 리셋돼 모든 `*-safe` 유틸이 무력화.
  `#app-page-shell` 은 자동으로 상/하단 inset 패딩 — 헤더/바텀네비 등 자체 처리 요소에는
  `data-safe-area-anchor="top"|"bottom"` 마커를 달아 이중 적용을 끈다. 하단 탭 스페이서는 `data-bottom-nav-spacer`.
- **화면 높이 유틸** (`utility.css`): `*-screen-enhanced`(page-shell content box 와 동일),
  `*-screen-without-header` / `*-screen-without-bottom-nav`(고정 바 제외 본문 높이 — `--spacing-header` /
  `--spacing-bottom-nav` 는 게이트 시 안전영역만큼 자동 증가), `h-dvh-safe-bottom-enhanced`(전체화면 포털),
  `scrollbar-hidden`, arc 스피너 / `animate-bottom-nav-in` 애니메이션.
- **눌림 피드백** (`press-feedback.css` + `<PressFeedback />`): `data-pressed` 기반. 스타일/타이밍은 CSS 단일 출처.
- **커스텀 포인터** (`custom-pointer.css` + `<CustomPointer />`): 마우스 전용 iPadOS 트랙패드 스타일. **기본은 미마운트** — 쓰려면 layout 에 `<CustomPointer />` 를 넣는다.
- **오버레이 모션** (`overlay-motion.css`): 시트/다이얼로그/vaul duration·easing CSS 변수 단일 출처
  (`--app-sheet-*`, `--app-dialog-*`, `--app-dim-*`). JS 언마운트 타이머는 `@/utils/overlay-motion.ts`.
- **토스트 모션** (`toast.css`): `app-toast-enter/exit-move/fade` keyframes + `.app-toaster` 겹쳐 덮기.
- **글로벌 리셋** (globals.css 본문): iOS 롱프레스 콜아웃 차단(입력 요소는 복원), 이미지/링크 드래그 차단,
  오버스크롤(rubber-band) 차단, 폼 UA 포커스 링 제거, `body.app-scroll-locked` 스크롤 락.

### Providers

```text
<NextIntlClientProvider>           // [locale]/layout.tsx
  <AppShellProviders>              // app-shell-providers.tsx
    <QueryProvider>                // QueryClient lazy init (SSR/CSR 격리)
      <NuqsAdapter>{children}</NuqsAdapter>
      <Toaster containerClassName="app-toaster" />
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
import { Link, useRouter, usePathname } from '@/i18n/navigation'; // 클라이언트
import { redirect, permanentRedirect } from '@/i18n/server-navigation'; // 서버 (await 필수)
```

- `router.replace` 는 열린 모달의 back-stack sentinel 을 자동으로 pop 한 뒤 replace 한다.

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
