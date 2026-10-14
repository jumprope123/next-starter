<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Agent Guide (template-next-single)

본 문서는 이 보일러플레이트 (또는 이를 fork 해 시작한 신규 프로젝트) 에서 작업하는 코드 에이전트를 위한 안내입니다. 새 프로젝트를 시작할 때 **설정 / 유틸 / 훅을 새로 만들 필요 없이 곧바로 기능 개발** 에 들어갈 수 있도록, 자주 쓰이는 모든 것을 미리 마련해 두었습니다.

## 0. Always-do

0. **세션에서 첫 응답을 하기 전에 Next.js 와 동반 의존성이 최신 안정판인지 확인한다** (2026-10-08 사용자 지시, 2026-10-14 대상 확대 · 개인 프로젝트 — 아나나마켓 · 오브차니 · 우동단 · 백룸 · 남대문리뷰 · 아이사이즈 · 먹깨비런치 · next-starter · 시티히든팩트 · 하이퍼로컬 — 이 같은 규칙을 쓴다).
   `npm view next version`(`latest` 꼬리표다 — 카나리아 · 베타 · rc · preview 는 따라가지 않는다)을 `package.json` 의 `next`(pnpm catalog 를 쓰는 모노레포는 `pnpm-workspace.yaml` 의 catalog 값과 각 앱 `package.json`)와 비교해, **뒤처져 있으면 사용자가 묻지 않았어도 응답 첫머리에 한 줄로 알리고 올릴지 묻는다**(예: «넥스트 16.4.0 이 나왔습니다 — 지금 16.2.5»). 같으면 말하지 않는다. 조회가 안 되면 «확인하지 못했다» 고 한 줄 남긴다 — 안 돈 확인을 «최신» 으로 치지 않는다.
   같은 자리에서 아래 «next 만 올리지 않는다» 의 동반 의존성(`eslint-config-next` · `react` · `react-dom` · `@types/react` · `@types/react-dom` · `next-intl` · `nuqs` · `better-auth` · `babel-plugin-react-compiler` 중 쓰는 것)도 `pnpm outdated` 로 보고, 뒤처진 것이 있으면 같은 한 줄에 덧붙인다.
   **늘 묻고 올린다 — 사용자가 하자고 하기 전에는 올리지 않는다**(뒤처진 폭이 작아도 · 보안 패치여도). 올릴 때는 **`vercel:next-upgrade` 스킬**(버셀 공식 — 이행 안내 · codemod)로 하고, 하던 일의 변경과 섞지 않는다(커밋은 사용자가 정한다). 이 템플릿에서 파생한 프로젝트도 이 규칙을 그대로 쓴다.
   - **next 만 올리지 않는다.** `eslint-config-next` 는 next 와 같은 버전으로, `react` · `react-dom` · `@types/react` · `@types/react-dom` 은 새 next 의 peer 범위(`npm view next@<버전> peerDependencies`)에 맞추고, next 에 얹혀 도는 `next-intl` · `nuqs` · `better-auth` · `babel-plugin-react-compiler` 가 새 버전을 받는지 보고 필요하면 같이 올린다. Node 엔진 요구가 바뀌었는지도 본다. `pnpm install` 에 peer 경고가 남으면 끝난 것이 아니다.
   - **사이드 이펙트를 먼저 읽는다.** 지금 버전부터 새 버전까지의 릴리스 노트 전부와 `node_modules/next/dist/docs/` 의 업그레이드 안내에서, 우리가 쓰는 것(미들웨어 · `next.config.ts` · `next typegen` · Turbopack · React Compiler · `next/image` · Route Handler · 데이터 캐시 · 메타데이터 · Cache Components) 가운데 바뀐 것을 짚어 보고한다.
   - **검증은 §6 검증 절차 전부** — lint → 타입 검사 → build → 앱을 띄워 주요 화면을 실제로 본다. 하나라도 걸리고 못 고치면 **올리지 않고** 까닭을 알린다.
   - **기존 기능에 이슈가 생기면 안 된다.** 올리기 전에 같은 화면 · 흐름을 먼저 돌려 기준을 잡고, 올린 뒤 같은 것을 다시 돌려 견준다 — 타입 검사 · 빌드를 통과하고도 실행할 때 죽는 것이 있어, 통과는 «안 깨졌다» 가 아니다. 달라진 동작은 우리 코드를 고쳐 맞추고, 못 맞추면 올리지 않는다.
   - **올린 뒤에는 중요한 변경을 정리해 알린다** — 새로 쓸 수 있게 된 것 · 바뀐 기본값과 동작 · 사라질 예정인 것 · 같이 올린 의존성과 버전 · 그 때문에 우리 코드에서 고친 곳 · 확인한 것과 확인하지 못한 것. 알릴 것이 없으면 «중요한 변경 없음» 한 줄.
1. **Next.js 관련 작업 전에는 반드시 `node_modules/next/dist/docs/` 에서 해당 항목 문서를 읽는다.** 학습 데이터는 오래되었을 수 있다.
2. **새 파일을 만들기 전에 `src/utils`, `src/hooks`, `src/components`, `src/stores`, `src/providers` 의 `index.ts` 재수출을 먼저 확인한다.** 동일/유사 기능이 이미 있으면 그것을 사용한다.
3. **alias 를 일관되게 사용한다.** `@/...` → `src/`, `#/...` → `public/`. 상대 경로는 같은 기능 폴더 내부에서만 허용한다.
4. **기능을 추가하면 해당 폴더의 `index.ts` 에 export 를 잊지 않는다.**
5. **Server / Client 컴포넌트 경계를 의식한다.** 클라이언트 훅(`useState`, `useEffect`, zustand, react-query) 을 쓰는 파일은 첫 줄에 `'use client'`.
6. **i18n 라우팅 / redirect 는 `@/i18n/navigation` 또는 `@/i18n/server-navigation` 에서만 import.** `next/link`, `next/navigation` 직접 사용 금지. 예외는 next-intl 이 감싸지 않는 `notFound` / `useSearchParams` 와, `bfcacheId` 를 읽으려는 `src/components/route-preserve.tsx` 의 `useRouter`(라우팅에는 쓰지 않음) 뿐이며, 해당 import 에는 이유를 주석으로 남긴다. (`useRouter` 는 back-stack sentinel 정리까지 해주므로 우회하면 바텀시트 뒤로가기가 깨진다.)
7. **className 합성은 항상 `cn(...)` 을 사용한다.** (`@/utils/class.ts`)
8. **모든 `page.tsx` 는 default export 를 `freshOnNavigation(Page)` 또는 `noRoutePreserve(Page)` 로 감싼다.** Cache Components 가 떠난 화면을 보존하기 때문이다 — 규칙은 §8, 원리·함정은 [docs/cache-components-guide.md](docs/cache-components-guide.md). 감싸지 않으면 ESLint `app/page-route-preserve` 가 오류를 낸다.

## 1. 한눈에

| 항목       | 값                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 프레임워크 | Next.js 16 (App Router, Turbopack) + React 19 + React Compiler + Cache Components (`partialPrefetching`)                       |
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
| `useResetOnHide`      | 보존되는 화면이 **숨겨질 때** 일시 state 를 되돌린다(열린 모달·시트, 진행 플래그, 1회 ref). 언마운트 때도 돈다 — 로컬 state 만 (§8)         |
| `useScrollLock`       | body 스크롤 락 — 참조 카운팅 + `body.app-scroll-locked` 클래스 토글 (3rd-party inline overflow 와 직교)                                     |
| `useSettingsHydrated` | 영속 store(zustand persist) 복원 완료 여부 — 기본값→복원값 전환을 감추고 싶을 때 게이트로 쓴다                                              |

> **`useDismissOnBack` 은 화면이 숨겨질 때 모달을 자동으로 닫지 않는다.** `freshOnNavigation` 으로 감싼(뒤로가기에서 보존되는)
> 화면에서는 반드시 `useResetOnHide(close)` 를 함께 걸어 직접 닫는다 (§8-2). 자동으로 닫지 않는 것은 의도다 — `onClose` 가
> 라우팅을 하는 인터셉터일 수 있어서다.

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
| `freshOnNavigation(Page)`           | 탐색 page(목록·상세·검색) 래퍼 — 링크 재진입은 새로, 뒤로/앞으로만 보존 (§8)                                                             |
| `noRoutePreserve(Page)`             | 그 외 page(거래·마이페이지·어드민·폼) 래퍼 — 보존하지 않는다(도입 전 동작). 애매하면 이것 (§8)                                           |
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
> **단, 공식 방식(React `<ViewTransition>` + `<Link transitionTypes>`)도 시도했다가 되돌렸다**
> (2026-09-16, 커밋 8f7b1cf → revert 95d2a40). **공유 요소 morph 가 될 때도 있고 안 될 때도
> 있었고, 원인을 규명하지 못했다.**
>
> 확인된 사실만 적는다.
> - 네비게이션 transition 과 도착 콘텐츠 렌더가 일관되게 ~430ms 벌어졌다. 그 사이 전환에 참여한
>   것은 **떠나는 페이지뿐**이고, 도착 페이지의 `<ViewTransition>` 은 아예 참여하지 않았다
>   (`frame-*` 이름이 한쪽에도 찍히지 않고 React 자동 이름 `_t_0_` 만 부여됨 = 공유 쌍 미성립).
> - 아래 가설을 하나씩 검증했고 **전부 기각**됐다:
>   (a) `[locale]/layout.tsx` 의 fallback 없는 `<Suspense>{children}</Suspense>` — 제거해도 동일.
>   (b) `#app-page-shell` div 가 페이지의 VT 를 감싸는 배치(스킬의 Critical Placement Rule) — 제거해도 동일.
>   (c) 동적 라우트 prefetch 부족 — `prefetch={true}` + `generateStaticParams`(ƒ→●) 로도 해결 안 됨.
>
> **미해결로 남은 모순:** 자동화 계측에서는 morph 가 100% 실패로 나왔는데 실제 브라우저에서는
> 간헐적으로 성공했다. 즉 성공 케이스를 재현하지 못했다. 다시 시도한다면 **먼저 성공 케이스를
> 재현할 방법부터** 찾을 것 — 그게 없으면 가설을 찍는 수밖에 없고, 위 (a)(b)(c) 가 그렇게 빗나갔다.
> (실험 기록은 로컬 `vt-retry` 브랜치에 남겨 뒀다. 원격에는 없다.)
>
> 패턴 가이드: `npx skills add vercel-labs/agent-skills --skill vercel-react-view-transitions`.

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

- 서버의 로케일은 `src/i18n/request.ts` 가 `next/root-params` 의 `locale()` 로 읽는다. next-intl 의 `requestLocale`(헤더 기반)로
  되돌리지 않는다 — 되돌리면 언어 전환 링크로 이동했을 때 서버 번역 문구가 이전 로케일로 남는다 (§8-4).

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
11. 새 page 를 만들 때마다 §8 을 따른다 (page 감싸기, 보존 화면의 오버레이 닫기, 인증 이동은 하드 이동). 파생 프로젝트의 할 일은 [docs/cache-components-guide.md](docs/cache-components-guide.md) §8.
12. 이 `AGENTS.md` 는 그대로 두고, 프로젝트 고유 규칙은 파일 끝에 `## Project-specific notes` 섹션으로 추가한다.

## 8. Cache Components (`cacheComponents` · `partialPrefetching`)

떠난 화면이 언마운트되지 않고 React `<Activity>` 로 숨겨진 채 보존된다 (최대 3개 — state·ref·DOM·스크롤이 그대로 남고, 숨김 때 effect cleanup, 재표시 때 effect 재실행).
정책은 **"탐색 화면의 뒤로·앞으로 이동만 보존, 서버 렌더는 완전 동적"** 이다. 원리·검증 내역·함정 전체는 [docs/cache-components-guide.md](docs/cache-components-guide.md). 아래는 규칙 요약이다.

### 8-1. page 감싸기

- **모든 page 는 default export 를 둘 중 하나로 감싼다** (`@/components`).
  - 탐색 화면(홈·목록·상세·검색·공지 등 읽기 화면) → `export default freshOnNavigation(Page)`. 링크·`router.push` 로 다시 들어오면 새로 시작하고 뒤로·앞으로만 보존된다.
  - 그 외 전부(장바구니·주문서·마이페이지·어드민·로그인·폼) → `export default noRoutePreserve(Page)`. 보존하지 않는다(도입 전 동작). 화면별 초기화 코드는 필요 없다.
  - **애매하면 `noRoutePreserve`.**
- 감싸지 않으면 링크 재진입에서도 옛 state 가 남아 `useState(initialX)` 가 서버의 새 값을 받지 않는다 (주문서라면 고른 것과 다른 품목이 주문된다).
- `NoRoutePreserve` 의 key(`bfcacheId` + 숨김 epoch)는 둘 다 필요하다 — 하나를 빼지 않는다. layout 에 `key={pathname}` 래퍼를 두는 방식은 쓰지 않는다(page 보다 넓게 리셋된다).
- 빠뜨리면 ESLint `app/page-route-preserve` 가 오류로 막는다. 규칙을 끄거나 `eslint-disable` 로 넘기지 않는다.

### 8-2. 보존되는 화면(`freshOnNavigation`)에서 화면을 만들 때

- **`useDismissOnBack` 을 쓰는 모달·바텀시트·다이얼로그는 반드시 `useResetOnHide(close)` 로 숨김 때 닫는다.**
  훅이 자동으로 닫지 않는다. 빠뜨리면 모달을 연 채 (모달 안 링크 등으로) 이동했다가 뒤로 돌아왔을 때 모달이 다시 열려 있고,
  **뒤로가기가 그 모달을 닫지 못하며** 앞으로가기 기록이 잘린다. `noRoutePreserve` 화면에는 필요 없다.

```text
const { isOpen, open, close } = useDisclosure();
useDismissOnBack(isOpen, close);
useResetOnHide(close); // freshOnNavigation 화면에서는 필수
```

- 그 밖에 보존되면 이상한 일시 state(비밀번호 입력값, 오류 문구, 진행 플래그, 1회성 ref)도 `useResetOnHide` 로 되돌린다. 콜백은 언마운트 때도 돌므로 로컬 state·ref 만 만진다(전역 스토어·라우팅·API 호출 금지).
- effect 는 재표시마다 다시 돈다. 진입 1회만 해야 하는 일은 ref 가드, 조회수·분석 기록은 sessionStorage dedupe.
- `document.querySelector` / `getElementById` 는 숨겨진 화면의 사본을 잡을 수 있다 — ref 를 쓰거나 보이는 노드(`getClientRects().length > 0`)만 고른다. E2E 셀렉터도 가시성을 명시한다.

### 8-3. 이동

- **로그인·로그아웃·탈퇴처럼 신분이 바뀌는 이동은 `window.location.replace(getPathname({ href, locale }))`** 로 문서를 새로 연다. `router.replace` 는 이전 신분의 화면을 보존한 채 남긴다.

### 8-4. 서버

1. **로케일은 `next/root-params` 로 읽는다** (`src/i18n/request.ts`). URL 에 따라 달라지는 서버 출력은 `params`·`searchParams`·루트 param 에서 읽고, 미들웨어가 넘긴 헤더(경로·테넌트 등)로 가르지 않는다 — `params` 를 읽지 않는 page 의 출력은 모든 param 값이 공유한다.
2. **route segment config `dynamic` · `revalidate` · `fetchCache` · `dynamicParams` · `runtime` 은 빌드 오류다** (`runtime = 'nodejs'` 도 안 된다). `force-dynamic` 자리는 `await connection()`. `maxDuration` 은 쓸 수 있다.
3. **요청 데이터(세션·쿠키·헤더·`request`)를 읽지 않는 GET Route Handler 는 첫 줄에 `await connection()`** (`next/server`). 없으면 빌드 때 프리렌더되어 배포 시점 값으로 굳는다. 빌드 출력에서 API 가 `○` 가 아닌지 확인한다.
4. **서버 컴포넌트에서 `new Date()` · `Date.now()` · `Math.random()` · `crypto.randomUUID()` 앞에는 `await connection()`.** `cookies()`·`searchParams` 뒤에 두는 것은 빌드만 통과하고 dev 에서 오류다.
5. 루트 `[locale]/layout.tsx` 의 `export const instant = false` · `generateStaticParams`, `next.config.ts` 의 `experimental.instantInsights.validationLevel: 'manual-warning'` 을 지우지 않는다. 서버 렌더를 완전 동적으로 유지하고 dev 검증 잡음을 막는 장치다.
6. `'use cache'` 로의 전환은 범위 밖이다. 예외는 `sitemap.ts` 의 빌드 시각 헬퍼뿐이다(도입 전처럼 정적 sitemap 을 유지하려는 것).
