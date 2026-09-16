# template-next-single

TypeScript 기반 Next.js 16 (App Router) 단일 앱 보일러플레이트. 프로젝트를 시작하자마자 i18n / 데이터 패칭 / 상태 관리 / 폼 검증 / 커스텀 훅 / 유틸리티 / 코드 품질 도구가 모두 동작하도록 미리 구성되어 있어, **설정 작업 없이 곧바로 기능 개발에 들어갈 수 있다.**

> 같은 저장소의 `next-app-boilerplate` 와 mukkebi 모노레포 (`apps/bnk` + `packages/*`) 의 합의된 결정을 한 단일 앱 폴더로 합쳐 둔 결과물이다.

---

## 요구 사항

| 항목    | 버전                                     |
| ------- | ---------------------------------------- |
| Node.js | `>=24.12.0 <25.0.0`                      |
| pnpm    | `10.30.3` (`packageManager` 필드로 강제) |

`.npmrc` 의 `engine-strict=true` 가 켜져 있어 다른 버전에서는 `pnpm install` 이 실패한다.

---

## 빠른 시작

```bash
pnpm install        # 의존성 설치 + husky pre-commit 활성화
pnpm dev            # 개발 서버 실행
pnpm dev:staging    # .env.staging 을 로드한 개발 서버 (dotenv-cli)
pnpm build          # 프로덕션 빌드
pnpm start          # 빌드 결과 실행
pnpm lint           # ESLint
pnpm check-types    # next typegen + tsc --noEmit
pnpm format         # Prettier
pnpm clean          # .next / tsconfig.tsbuildinfo 제거
```

VS Code / IntelliJ Idea 의 사전 실행 구성 (`.vscode/launch.json`, `scripts/Build.run.xml`, `scripts/Debug.run.xml`) 이 포함되어 있어 IDE Run/Debug 패널에서도 곧바로 실행할 수 있다.

---

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack) + React 19 + React Compiler
- **언어**: TypeScript 5, `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`
- **스타일**: Tailwind CSS 4 (`@tailwindcss/postcss`) + `cn(clsx + tailwind-merge)` + `tailwindcss-safe-area`
- **상태**: zustand 5 (모든 store 는 `'use client'`)
- **데이터**: `@tanstack/react-query` 5 + `@lukemorales/query-key-factory` + `return-fetch` 기반 `fetchExtended` / `fetcher`
- **폼**: `react-hook-form` + `zod` + `@hookform/resolvers`
- **i18n**: `next-intl` 4 (`localePrefix: 'as-needed'`, ko / en)
- **URL 상태**: `nuqs`
- **토스트**: `react-hot-toast`
- **모션**: framer-motion + GSAP (ScrollTrigger 1 회 등록)
- **유틸**: `date-fns`, `query-string`, `mobile-detect`, `usehooks-ts`, `core-js`
- **품질 게이트**: ESLint(`eslint-config-next` + `no-console: warn`) / Prettier(`prettier-plugin-tailwindcss`) / husky pre-commit (lint-staged)

---

## 디렉터리 구조

```
src/
├── actions/            'use server' Server Actions (cookie, time)
├── app/
│   ├── [locale]/       모든 페이지 — root layout 도 [locale] 안에 둔다
│   │   ├── _components/
│   │   ├── error.tsx        세그먼트 에러 폴백
│   │   ├── layout.tsx       Polyfill / NextIntlClientProvider / AppShellProviders / Suspense / MobileDetector / Portal mount
│   │   ├── loading.tsx      Suspense 폴백
│   │   ├── not-found.tsx    404 폴백
│   │   └── page.tsx         데모 랜딩 페이지
│   ├── api/ping/       헬스체크 Route Handler (데모)
│   ├── favicon.ico
│   ├── global-error.tsx     루트 레이아웃 자체에서 에러가 났을 때의 글로벌 폴백
│   ├── robots.ts
│   └── sitemap.ts
├── components/         재사용 컴포넌트 (Polyfill, MobileDetector, NextImage, Portal, Skeleton, AnimatedTimer, TextMotion, ClientOnly, ErrorBoundary)
├── constants/          쿠키 이름 / 라우트 경로 등 정적 상수 (CookieName, ROUTE_PATHS)
├── core/               인프라 레벨 (fetchExtended, fetcher, ApiError, createFormData, demo API)
├── hooks/              커스텀 훅 (useMedia, useDisclosure, useDebouncedValue, useCopyToClipboard, useMounted, useToggle, useSearchQuery, ...)
├── i18n/               next-intl 설정 (routing, navigation, server-navigation, useAppTranslation, getServerAppTranslation)
├── messages/           번역 JSON (ko.json, en.json)
├── providers/          AppShellProviders, QueryProvider (lazy init), query-key 팩토리
├── proxy.ts            Next.js 16 미들웨어 (next-intl 라우팅)
├── stores/             zustand store (media, mobile, settings — session/local persist)
├── styles/             전역 CSS (globals, variables, colors, fonts, layout, utility, gsap)
├── types/              전역 타입 / 환경 변수 선언
└── utils/              순수 유틸리티 (array, format, query, storage, clipboard, download, env, number, type, ...)

public/
├── fonts/              Pretendard Variable woff2
└── *.svg               기본 정적 자산
```

`tsconfig.json` 의 path alias:

| Alias | 대상         |
| ----- | ------------ |
| `@/*` | `./src/*`    |
| `#/*` | `./public/*` |

각 폴더의 `index.ts` 가 하위 모듈을 재수출하므로, 외부에서는 `@/utils`, `@/hooks`, `@/components`, `@/stores`, `@/actions`, `@/core`, `@/providers`, `@/constants`, `@/i18n` 형태로만 임포트한다.

---

## 핵심 기능

### Components (`src/components`)

| 컴포넌트                            | 역할                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| `Polyfill`                          | core-js 폴리필을 클라이언트 번들에 1 회 주입 (렌더 X)   |
| `MobileDetector`                    | User-Agent 분석 결과를 `useMobileStore` 에 기록         |
| `Portal`                            | `#next-app-portal` 노드로 children 포털링 (SSR off)     |
| `NextImage` / `NextImage.Protected` | `next/image` 래퍼 (비율 / fallback / 우클릭 보호)       |
| `AnimatedTimer`                     | 두 자리 숫자 슬라이드 카운터 (framer-motion)            |
| `TextMotion`                        | 텍스트 순환 + 글자 스태거 모션                          |
| `Skeleton`                          | `react-loading-skeleton` 얇은 래퍼                      |
| `ClientOnly`                        | hydration 부조화 방지 (마운트 전에는 fallback 렌더)     |
| `ErrorBoundary`                     | 위젯 단위 에러 폴백 (페이지 단위는 `app/.../error.tsx`) |

### Hooks (`src/hooks`)

| 훅                   | 역할                                                       |
| -------------------- | ---------------------------------------------------------- |
| `useMedia`           | Tailwind `sm/md/lg/xl` 매칭 → zustand 동기화               |
| `useContainer`       | 와이드 화면(>1920px) 좌우 균등 padding 계산                |
| `useFocusScroll`     | 가로 스크롤 컨테이너에서 특정 자식 위치로 스크롤           |
| `useOnClickOutside`  | ref 외부 mouseup 감지                                      |
| `useScrollPage`      | 가로 캐러셀의 페이지 인덱스 추적 / 이동                    |
| `useScrollFadeIn`    | GSAP ScrollTrigger 페이드 인                               |
| `useGrabSlide`       | 마우스 드래그로 가로 스크롤 조작                           |
| `useAllSearchParams` | `URLSearchParams` → 객체 변환                              |
| `useSearchQuery`     | URL 쿼리 읽기 / 쓰기 / 리셋                                |
| `useServerNow`       | 서버 시간 기준 1 초 단위 `now` 갱신                        |
| `useDisclosure`      | 모달/시트/드롭다운 토글 (`isOpen / open / close / toggle`) |
| `useToggle`          | 단순 boolean 토글 (`[value, toggle, set]`)                 |
| `useMounted`         | hydration 이후 마운트 여부                                 |
| `useDebouncedValue`  | 입력 값을 디바운스해 안정적인 값 반환                      |
| `useCopyToClipboard` | 복사 + `isCopied` 피드백 상태                              |

### Utils (`src/utils`)

| 모듈        | 주요 export                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `array`     | `shuffle`, `getChunkedArray`, `filterDuplicateItem`, `deepCopy`                                                    |
| `boolean`   | `isTrue`                                                                                                           |
| `class`     | `cn` (clsx + tailwind-merge)                                                                                       |
| `clipboard` | `copyToClipboard`                                                                                                  |
| `date`      | `secondsToMinutes`, `getElapsedTime`                                                                               |
| `device`    | `isTouchDevice`                                                                                                    |
| `download`  | `downloadFile`                                                                                                     |
| `element`   | `getHighlightedText`                                                                                               |
| `env`       | `isServer`, `isClient`, `isDevelopment`, `isProduction`, `isTest`                                                  |
| `format`    | `toNumber`, `formatNumber`, `joinValueUnit`, `formatPhoneNumber`, `phoneNumberUtil`, `formatDate`, `calculateDday` |
| `keyboard`  | `isEnter` (IME 대응)                                                                                               |
| `meta`      | `staticMetadata`, `shareCurrentPage`                                                                               |
| `next`      | `allowCors` (Route Handler CORS 래퍼)                                                                              |
| `number`    | `clamp`, `range`, `lerp`                                                                                           |
| `object`    | `compareAllKeys`, `hasAllValues`, `withSubComponents`, `pick`, `omit`, `removeUndefined`                           |
| `promise`   | `getFulfilledResults`, `getRejectedResults`, `sleep`, `withTimeout`, `retry`                                       |
| `query`     | `isValidQuery`, `addToQuery`, `removeFromQuery`, `createHrefQuery`                                                 |
| `ref`       | `mergeRefs`                                                                                                        |
| `storage`   | `storage` (localStorage), `sessionStorage` (둘 다 SSR-safe + JSON 자동 직렬화)                                     |
| `type`      | `assertNever`, `isObject`, `isNotNullish`                                                                          |

### Stores (`src/stores`)

| Store                     | 설명                                                                   |
| ------------------------- | ---------------------------------------------------------------------- |
| `useMediaStore`           | `sm / md / lg / xl` boolean. `useMedia` 훅이 갱신                      |
| `useMobileStore`          | `isMobile / isAndroid / isIOS / isReady`. `<MobileDetector />` 가 채움 |
| `useLocalSettingsStore`   | localStorage 영구 저장 (`isDarkMode` 예시)                             |
| `useSessionSettingsStore` | sessionStorage 보존 (`isLaunched` 예시)                                |

### Core / Actions (`src/core`, `src/actions`)

- `core/fetch.ts` — `fetchExtended` (4xx/5xx 시 `ApiError` throw), `fetcher<T>` (`/proxy/app` 자동 prefix + JSON 파싱), `createFormData`, `ApiError` (status / body / data / url 정보를 들고 있는 에러).
- `core/demo` — `getPing` (`/api/ping`) 데모 호출. 시작할 때 가장 먼저 지우거나 교체할 곳.
- `actions/cookie.actions.ts` — `setCookieAction / getCookieAction / deleteCookieAction` (httpOnly, JSON 자동 직렬화).
- `actions/time.actions.ts` — `getServerTime`. `useServerNow` 훅이 사용.

### Providers (`src/providers`)

```tsx
<NextIntlClientProvider>
  {' '}
  // [locale]/layout.tsx
  <AppShellProviders>
    {' '}
    // app-shell-providers.tsx
    <QueryProvider>
      {' '}
      // QueryClient lazy init — 서버는 매 요청 / 브라우저는 싱글턴
      <NuqsAdapter>{children}</NuqsAdapter>
      <Toaster /> // react-hot-toast
    </QueryProvider>
  </AppShellProviders>
</NextIntlClientProvider>
```

새 도메인 쿼리 키는 `src/providers/query-provider/query-keys/<domain>-query-keys.ts` 에 `createQueryKeys` 로 추가하고, 같은 폴더의 `index.ts` 의 `mergeQueryKeys(...)` 인자에 등록한다. 사용 측은 `import { queries } from '@/providers'` → `useQuery(queries.<domain>.<query>())`.

### i18n (`src/i18n`)

- 라우팅: `localePrefix: 'as-needed'`, 기본 로케일 `ko` (prefix 없음), 추가 로케일 `en` (`/en/*`).
- 메시지: `getAppMessages(locale)` 한 곳에서 관리. JSON 직접 import 금지.
- 페이지 경로: 항상 `app/[locale]/...` 아래에 둔다 — root `app/layout.tsx` 는 두지 않는다.
- 번역 호출 (fallback / values 지원):
  ```tsx
  // 클라이언트
  const t = useAppTranslation();
  t('home.title', { fallback: '홈' });
  t('home.greeting', { fallback: '안녕하세요, {name}', values: { name } });

  // 서버 (RSC / Server Action)
  const t = await getServerAppTranslation();
  t('home.title', { fallback: '홈' });
  ```
- Navigation: `next/link` / `next/navigation` 의 `Link, redirect, useRouter, usePathname` 대신 항상 다음을 쓴다.
  ```ts
  import { Link, useRouter, usePathname } from '@/i18n/navigation'; // 클라이언트
  import { redirect, permanentRedirect } from '@/i18n/server-navigation'; // 서버 (await 필수)
  ```
- 로케일 추가 시: `routing.ts` 의 `locales` 에 코드 추가 → `messages/<code>.json` 작성 → `messages.ts` 의 `messagesByLocale` 에 등록.

### Constants (`src/constants`)

- `CookieName` enum — 쿠키 이름은 항상 enum 으로 참조해 오타 / 충돌을 컴파일 타임에 잡는다.
- `ROUTE_PATHS` — 페이지 경로를 한 곳에 모은다 (locale prefix 는 i18n 헬퍼가 자동 부여).

---

## 설정 / 도구

- **Next.js** (`next.config.ts`)
  - `experimental.scrollRestoration: true`
  - `reactCompiler: true`
  - `images.formats: ['image/avif', 'image/webp']`, `images.qualities: [5..100]` 단계
  - `compiler.removeConsole`: production 빌드에서 `console.*` 제거 (`console.error` 만 보존)
  - `rewrites`: `/proxy/app/*` → `APP_API_BASE_URL`, `/proxy/data/*` → `APP_IMAGE_BASE_URL/data`, `/proxy/image/*` → `APP_API_BASE_URL/image`
- **TypeScript** (`tsconfig.json`)
  - `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`, `moduleResolution: bundler`
  - `paths`: `@/* → src/*`, `#/* → public/*`
- **ESLint** (`eslint.config.mjs`)
  - `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
  - `no-console: warn` (의도적 호출은 disable 주석으로 명시)
- **Prettier** (`prettier.config.mjs`)
  - `printWidth: 120`, `singleQuote: true`, `trailingComma: 'es5'`, `endOfLine: 'lf'`, `semi: true`
  - `prettier-plugin-tailwindcss` 활성화 (`cn`, `clsx`, `tw`, `twMerge`, `cva` 인식, `tailwindStylesheet: ./src/styles/globals.css`)
- **husky + lint-staged**
  - 커밋 직전 `eslint --fix` + `prettier --write` 자동 적용
- **Vercel 배포** (`vercel.json`)
  - 기본 region 은 `icn1` (Seoul) 단일 지정

---

## 환경 변수

`.env.example` 참고:

```env
# 백엔드 API 기본 URL — `next.config.ts` 의 `/proxy/app/*` rewrite 가 사용한다.
APP_API_BASE_URL=https://api.example.com

# 이미지 / 정적 리소스 호스트 — `/proxy/data/*` rewrite 가 사용한다.
APP_IMAGE_BASE_URL=https://img.example.com

# 운영 도메인 (예: https://www.example.com) — sitemap.ts / robots.ts / OG 메타에서 사용한다.
NEXT_PUBLIC_SITE_URL=https://www.example.com
```

새 환경 변수를 추가할 때마다 `src/types/environments.d.ts` 의 `ProcessEnv` 인터페이스에 키를 함께 등록해 자동완성과 타입 안전을 얻는다. `NEXT_PUBLIC_*` 접두사가 붙은 값만 클라이언트 번들에 노출된다.

---

## 새 프로젝트로 옮길 때 체크리스트

1. `package.json` 의 `name` 을 새 프로젝트 이름으로 변경.
2. `src/app/[locale]/layout.tsx` 의 `metadata` (`title`, `description`) 와 `viewport` 갱신.
3. `src/app/robots.ts` / `src/app/sitemap.ts` 의 정책 / 도메인 (`NEXT_PUBLIC_SITE_URL`) 검토.
4. `vercel.json` 의 `regions` 가 서비스 권역과 맞는지 확인 (기본값 `icn1`).
5. `src/app/[locale]/page.tsx` 와 `src/app/[locale]/_components/template-playground.tsx` 는 데모용 — 자유롭게 교체 / 삭제.
6. `src/core/demo/` 와 `src/app/api/ping/` 도 데모이므로 새 백엔드를 붙일 때 같이 정리.
7. `src/messages/*.json` 의 데모 키 (`template.*`) 를 비우고 실제 카탈로그를 채운다 (`common.*` 키는 보존 권장 — 404 / error 폴백이 사용).
8. `src/constants/cookie.constants.ts` / `route-path.constants.ts` 를 프로젝트 도메인에 맞게 채운다.
9. `src/types/environments.d.ts` 의 `ProcessEnv` 에 새 환경 변수 타입을 등록한다.
10. `src/app/[locale]/error.tsx` / `not-found.tsx` / `loading.tsx` 의 디자인을 디자인 시스템에 맞게 다듬는다.
11. 사용하지 않는 컴포넌트 / 훅(`useGrabSlide`, `useScrollFadeIn`, `TextMotion`, `AnimatedTimer` 등) 은 폴더의 `index.ts` 에서 export 만 빼는 식으로 "비활성화" 처리하여 보일러플레이트의 학습 자료 가치를 보존하는 것을 권장한다.
12. `AGENTS.md` / `CLAUDE.md` 는 그대로 두고, 프로젝트 고유 규칙은 파일 끝에 `## Project-specific notes` 섹션으로 추가한다.

---

## 데모 페이지

`pnpm dev` 후 `http://localhost:3000` 에 접속하면 다음을 한 번에 확인할 수 있다.

- next-intl + locale 라우팅 (한국어 ↔ English 전환)
- TanStack Query 가 `/api/ping` 을 호출해 서버 시간을 표시
- Zustand 로 ON/OFF 토글
- react-hook-form + zod 로 닉네임 입력 검증
- react-hot-toast 로 저장 토스트 띄우기

이 화면이 렌더되면 보일러플레이트의 모든 핵심 의존성이 정상 동작한다는 뜻이다.

---

## 라이선스

별도 라이선스가 부여되지 않은 사내 / 개인 보일러플레이트입니다. 새 프로젝트 시작 시 필요에 따라 추가하세요.
