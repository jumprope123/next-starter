# Cache Components · `<Activity>` 라우트 보존 가이드

> 대상: 이 템플릿(또는 여기서 파생된 프로젝트)을 고치는 사람과 코딩 에이전트.
> 새 page 를 만들거나 화면의 effect·state·오버레이를 고치기 전에 §4(구역)와 §5(판단 절차)를 먼저 본다.
> 파생 프로젝트를 시작했다면 §8(해야 할 일)부터 본다.
> 원본: anana_mall `docs/cache-components-guide.md`(그 원본은 react-user-web)를 템플릿용으로 옮겼다. 화면 목록·테스트 주문 같은 프로젝트 고유 내용은 뺐다.

근거 표시 — **[문서]** 설치된 Next 16.3.5 문서(`node_modules/next/dist/docs/`) · **[원본]** 원본 프로젝트가 도입하며 실측한 것 · **[검증]** 2026-10-14 이 저장소에서 직접 돌려 확인한 것(§7).

---

## 0. 한 장 요약

- `next.config.ts` 에 `cacheComponents: true` · `partialPrefetching: true` 가 켜져 있다. 다음 메이저에서는 둘 다 항상 켜지고 옵션이 사라진다. **[문서]**
- **서버 렌더는 예전과 같은 완전 동적이다.** 루트 `[locale]/layout.tsx` 가 `export const instant = false` 로 정적 셸 검증에서 빠져 있다. 빌드된 page 셸은 0바이트이고, HTML 응답 헤더도 `private, no-cache, no-store` 그대로다. **[검증]** `'use cache'` 로 옮기는 일은 이 템플릿의 범위 밖이다.
- **클라이언트 이동이 바뀐다.** 떠난 화면이 언마운트되지 않고 React `<Activity>` 로 숨겨진다(`display: none`). 최대 3개 라우트의 state·ref·DOM 이 살아 있다가 돌아오면 그대로 다시 보인다. **[문서]**
- 정책: **뒤로·앞으로 이동만 보존한다.** 그것도 탐색 화면(홈·목록·상세·검색 등)에 한해서다. 그 외 화면은 도입 전과 똑같이 들어올 때마다 새로 시작한다.

| 도구                                    | 위치                  | 한 줄 용도                                                                            |
| --------------------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `noRoutePreserve(Page)`                 | `@/components`        | 거래·마이페이지·어드민·폼 page 의 default export 를 감싼다. 보존하지 않는다           |
| `freshOnNavigation(Page)`               | `@/components`        | 탐색 page 의 default export 를 감싼다. 링크 재진입은 새로, 뒤로가기는 보존            |
| `NoRoutePreserve` · `FreshOnNavigation` | `@/components`        | 위 두 HOC 의 클라이언트 본체 (`route-preserve.tsx`)                                   |
| `useResetOnHide(fn)`                    | `@/hooks`             | 보존되는 화면에서, 숨겨질 때 일시 state 를 되돌린다                                   |
| `await connection()`                    | `next/server`         | 요청 데이터를 안 읽는 GET 핸들러·현재 시각을 쓰는 서버 page 를 요청 시점으로 못박는다 |
| ESLint `app/page-route-preserve`        | `eslint.config.mjs`   | 감싸지 않은 `page.tsx` 를 오류로 막는다                                               |
| `locale()` (`next/root-params`)         | `src/i18n/request.ts` | 로케일을 URL 데이터로 읽는다 — 언어 전환 때 서버 번역이 이전 로케일로 남지 않게 한다  |

---

## 1. 원리

### 1-1. Cache Components 가 바꾸는 두 축 [문서]

1. **서버 — 정적 셸(PPR) 모델.** 라우트를 빌드 때 프리렌더 가능한 부분과 요청 시점 부분(Suspense 안)으로 나눈다. 요청 데이터(`cookies()`·`headers()`·`params`·`searchParams`)나 캐시 안 된 데이터를 Suspense 밖에서 읽으면 검증이 알려 준다. 세그먼트에 `instant = false` 를 두면 "막혀도 되는 것"으로 표시돼 검증에서 빠진다.
2. **클라이언트 — 라우트 보존.** 떠난 page 를 `<Activity mode="hidden">` 으로 숨긴다. 최대 3개를 보존하고, 넘으면 가장 오래된 것을 버려 다음 진입 때 새로 렌더한다.

### 1-2. 숨김/재표시 때 정확히 일어나는 일 [문서]

| 시점        | 일어나는 일                                                           | 일어나지 않는 일                                                 |
| ----------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 숨김        | DOM 이 `display: none`. **모든 effect·layout effect 의 cleanup 실행** | 언마운트 없음 — `useState`·`useRef`·입력값·스크롤 위치가 그대로  |
| 숨겨진 동안 | 낮은 우선순위로 렌더될 수 있음                                        | effect 는 돌지 않음(타이머·리스너·폴링은 cleanup 으로 멈춘 상태) |
| 재표시      | `display` 복원, **모든 effect 가 deps 와 무관하게 다시 setup**        | state 초기화 없음                                                |

그래서 보존되는 화면에서는 세 가지 전제가 깨진다.

- "화면을 떠나면 state 가 사라진다" → 남는다.
- "mount effect 는 진입 1회" → 재표시마다 다시 돈다.
- "`useRef(false)` 1회 가드는 진입마다 초기화" → 초기화되지 않는다.

### 1-3. `bfcacheId` [문서]

`useRouter().bfcacheId`(`next/navigation`)는 가장 가까운 세그먼트가 push/replace 로 새로 만들어질 때만 바뀐다. 뒤로/앞으로·`router.refresh()`·쿼리나 해시만 바뀌는 이동에서는 그대로다. **layout 에서 읽으면 layout 의 id 가 나오므로 page 안에서 읽어야 한다.**

Next 문서는 `bfcacheId` 를 "마이그레이션 도구, 마지막 수단"으로 소개하고 새 코드에는 패턴별 초기화(§5)를 권한다. 이 템플릿은 "뒤로가기만 보존" 정책(§2)을 화면마다 흩어 구현하지 않으려고 page 단위 HOC 로 묶었다.

---

## 2. 정책

| 질문                   | 결정                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| 보존 범위              | **탐색 화면의 뒤로·앞으로만 보존.** 링크·`router.push` 재진입은 새로 시작     |
| 거래·마이페이지·어드민 | **보존하지 않는다** (도입 전과 같은 동작)                                     |
| 신분이 바뀌는 이동     | 로그인·로그아웃·탈퇴는 **하드 이동(`window.location`)** 으로 문서를 새로 연다 |
| 서버 렌더              | **완전 동적 유지.** `'use cache'` 전환은 범위 밖                              |

### 이점과 비용

- 탐색 화면의 뒤로가기가 즉시 그려진다. 다시 렌더하거나 `loading.tsx` 스켈레톤을 거치지 않는다. 무한 스크롤로 이어 붙인 목록, 고른 옵션, 보던 탭이 그대로다.
- 숨겨진 화면 최대 3개의 DOM·이미지가 남는다. 이미지가 많은 상세 화면은 증가폭이 크다 — 원본 프로젝트에서 상세를 연달아 본 뒤 DOM 노드가 626 → 2,233 개였다. **[원본]** 앱(WebView) 실기기 메모리는 파생 프로젝트에서 직접 본다(§8).
- HTML 이 커진다. 이 템플릿의 데모 홈은 압축 전 15,007 → 26,259 바이트다(RSC 페이로드가 한 번 더 인라인된다). **[검증]**
- 서버 응답 시간은 그대로다. 완전 동적을 유지하므로 이득도 손해도 없다.

---

## 3. 서버 쪽 규칙

### 3-1. 루트 레이아웃

```tsx
// src/app/[locale]/layout.tsx
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const instant = false;
```

- `generateStaticParams` — 루트 동적 세그먼트(`[locale]`)의 값을 빌드 때 알아야 한다. 없으면 `A required root parameter (locale) was not provided` 로 빌드가 깨진다. **[원본]**
- `instant = false` — 이 레이아웃은 safe-area 쿠키를 Suspense 밖에서 읽는다(파생 프로젝트라면 세션·헤더도). 이 설정이 예전과 같은 요청 시점 렌더를 허용한다. 동기 IO 금지(§3-4)는 면제되지 않는다. **[문서]**
- **둘 다 지우지 않는다.** 서버 렌더를 완전 동적으로 유지하는 장치다.

### 3-2. route segment config

`dynamic`·`dynamicParams`·`revalidate`·`fetchCache`·**`runtime`** export 는 빌드 오류다. Next 문서는 `runtime = 'edge'` 만 금지라고 적었지만 `runtime = 'nodejs'` 도 `Route segment config "runtime" is not compatible` 로 막힌다. **[원본]** `maxDuration` 은 그대로 쓸 수 있다.

`dynamic = 'force-dynamic'` 을 쓰던 자리는 지우고 `await connection()` 으로 바꾼다.

### 3-3. GET Route Handler

Cache Components 에서 `GET` 핸들러는 요청 데이터도 캐시 안 된 데이터도 읽지 않으면 **빌드 때 프리렌더된다.** **[문서]** 공지·설정·시각 같은 값이 배포 시점 값으로 굳으면 운영 사고다.

- 세션·쿠키·헤더·`request` 를 읽는 핸들러는 그 지점에서 요청 시점으로 빠진다. 손댈 것이 없다.
- **아무것도 읽지 않는 GET 은 첫 줄에 `await connection()`** 을 둔다. 데모 `api/ping` 이 그 예다.
- 빌드 출력에서 API 라우트가 전부 `ƒ` 인지 확인한다. 의도하지 않은 `○` 가 있으면 그 핸들러가 굳은 것이다.

`experimental.hideLogsAfterAbort: true` — 핸들러의 `try/catch` 가 프리렌더 이탈 예외를 잡아 `console.error` 로 찍는 것을 빌드 로그에서 숨긴다.

### 3-4. 현재 시각·난수 (동기 IO)

서버 컴포넌트·`generateMetadata` 에서 `new Date()`·`Date.now()`·`Math.random()`·`crypto.randomUUID()` 를 쓰려면 **그 앞에 `await connection()`** 을 둔다. `instant = false` 로도 못 피한다. **[문서]**

```tsx
import { connection } from 'next/server';

async function ReportPage() {
  await connection();
  const generatedAt = getNow(); // 렌더 본문에서 Date.now() 를 직접 부르면 react-hooks/purity 가 막는다 — 헬퍼로 뺀다
  ...
}
```

> **`cookies()`·`searchParams` 뒤에 두는 것으로는 부족하다.** 빌드는 통과하지만 dev 에서 `Next.js encountered the unstable value Date.now() while prerendering` 오류가 뜬다(부분 프리페치 검증은 쿠키·쿼리가 풀린 뒤까지 렌더를 이어 가기 때문이다). `connection()` 을 앞에 두면 dev·빌드 모두 조용하다. **[검증]**

### 3-5. dev 의 instant 검증

`next.config.ts` 의 `experimental.instantInsights.validationLevel: 'manual-warning'` 은 dev 검증을 **`instant` 를 명시한 세그먼트에만** 건다. **[문서]**

기본값(`'warning'`)에서는 루트 layout 의 `instant = false` 와 무관하게 모든 page 가 검증 대상이다. 서버 page 가 Suspense 밖에서 캐시 없는 `fetch`·`connection()` 을 쓰면 요청마다 `Next.js encountered uncached data during prerendering or a navigation` 오류가 뜬다 — `[locale]/loading.tsx` 가 있어도 그렇다. **[검증]** 완전 동적이 정책인 이 템플릿에서는 전부 잡음이라 꺼 두었다.

나중에 화면을 하나씩 정적 셸로 옮길 때는 그 page 에 `export const instant = true` 를 달아 검증을 켠다.

### 3-6. metadata route

`sitemap.ts` 는 `lastModified` 에 현재 시각을 쓴다. Cache Components 에서 `new Date()` 를 그냥 부르면 **빌드 때 정적(`○`)이 아니라 요청 시점(`ƒ`)** 으로 바뀌고 `lastModified` 가 요청 시각이 된다. **[검증]** 그래서 시각을 `'use cache'` + `cacheLife('max')` 헬퍼(`getBuildTime`)로 빼 도입 전처럼 정적으로 두었다 — 빌드 출력 `○`, `lastModified` 는 빌드 시각이고 요청마다 같다. **[검증]** 도입 전과 한 가지 다르다: `max` 프로필이라 30일이 지나면 백그라운드에서 다시 만들어져 그 시각으로 바뀐다(도입 전에는 다음 배포까지 그대로). 이 템플릿에서 `'use cache'` 를 쓰는 곳은 여기뿐이다. `robots.ts` 는 처음부터 정적이다.

### 3-7. 로케일은 루트 param 에서 읽는다 (`next/root-params`)

`src/i18n/request.ts` 는 로케일을 `next/root-params` 의 `locale()` 로 읽는다. **이걸 next-intl 의 `requestLocale` 로 되돌리지 않는다.**

Partial Prefetching 은 URL 데이터(`params`·`searchParams`)를 읽지 않는 page 의 출력을 그 라우트의 모든 param 값이 공유한다. `cookies()`·`headers()` 는 URL 데이터가 아니다. **[문서]** 그런데 next-intl 의 `requestLocale` 은 미들웨어가 넘긴 **헤더**로 로케일을 얻는다. 그래서 `getServerAppTranslation()` 만 쓰고 `params` 를 읽지 않는 page 는 "로케일과 무관한 출력"으로 취급돼, 언어 전환 링크로 이동하면 **URL 은 `/en` 인데 서버 번역 문구는 한국어**인 화면이 나온다(layout 은 `params` 를 읽어 `<html lang>` 만 바뀐다). 도입 전에는 없던 동작이고, 이 저장소의 데모 홈에서 그대로 재현됐다. **[검증]**

루트 param getter 는 URL 데이터라 이를 통해 로케일을 읽는 page 는 로케일별로 따로 다뤄진다. next-intl 4.13 도 `requestLocale`·`setRequestLocale` 을 deprecated 로 표시하고 이 방식을 안내한다.

- 루트 param getter 는 Server Action·Route Handler 에서 쓸 수 없다. **[문서]** `request.ts` 는 그때만 `requestLocale` 로 폴백하며, 두 경우 모두 도입 전과 같은 로케일이 나온다. **[검증]**
- 같은 이유로, **URL 에 따라 달라지는 서버 출력을 미들웨어가 넘긴 헤더(경로·테넌트 등)로 분기하지 않는다.** `params`·`searchParams`·루트 param 에서 읽는다.

### 3-8. 데이터 캐시

기존 `fetch(..., { next: { revalidate, tags } })` 와 `revalidateTag` 는 그대로 동작한다. `'use cache'` 로 옮기지 않는다.

---

## 4. 구역 — 어디가 보존되고 어디가 아닌가

화면은 둘 중 하나에 속한다. **모든 page 는 default export 를 둘 중 하나로 감싼다.** 감싸지 않은 page 는 Next 기본 동작(링크 재진입도 보존)이 되어 `useState(initialX)` 가 서버의 새 값을 받지 않는다 — `?v=1` 로 보던 화면을 떠났다가 `?v=2` 링크로 들어오면 prop 은 2 인데 state 는 1 이다. **[검증]**

빠뜨리는 것은 ESLint 규칙 `app/page-route-preserve`(`eslint.config.mjs`)가 막는다. `src/app/**/page.tsx` 의 default export 가 두 HOC 호출이 아니면 오류다 — `pnpm lint` 와 커밋 전 lint-staged 에서 걸린다. **[검증]** 규칙을 끄거나 `eslint-disable` 로 넘기지 않는다.

**애매하면 `noRoutePreserve`.** 도입 전과 같은 동작이라 화면별 처리가 필요 없다.

### 4-1. 보존하지 않는 구역 — `noRoutePreserve` (도입 전과 같은 동작)

"떠나면 초기화"가 전제인 화면: 장바구니 · 주문서 · 주문 완료/실패 · 마이페이지 · 회원 정보 · 설정 · 어드민 전체 · 로그인 · 가입 · 그 밖의 폼 화면.

```tsx
import { noRoutePreserve } from '@/components';

async function CheckoutPage(props: PageProps<'/[locale]/checkout'>) { ... }

export default noRoutePreserve(CheckoutPage);
```

**page 범위만 리셋한다.** layout·`loading.tsx` 경계는 건드리지 않으므로 구역 공통 UI 와 전환 중 화면이 도입 전과 같다.

`NoRoutePreserve` 의 key 는 두 부분이고 **둘 다 있어야 한다.**

| 부분        | 언제 바뀌나                            | 맡는 경우                                                                                               |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `epoch`     | 화면이 숨겨질 때 +1 (`useResetOnHide`) | 뒤로/앞으로 돌아왔을 때 state 가 남지 않게 한다. 이 이동에서는 `bfcacheId` 가 그대로다                  |
| `bfcacheId` | 링크·`router.push` 로 새로 들어올 때   | 숨겨질 때 만든 트리는 **그 시점의 서버 props** 로 state 를 굳혔다. 들어오는 시점에 한 번 더 새로 만든다 |

> **`epoch` 만 있으면 오주문이 난다.** `/checkout?items=A` 를 떠나면 숨겨진 주문서가 A 의 `initialItems` 로 새로 만들어진다. 이어서 `/checkout?items=B` 로 들어오면 서버는 B 를 내려 주지만 `useState(initialItems)` 는 이미 A 로 초기화돼 있어, 주문서가 A 를 보여 주고 A 를 주문한다. **[원본]**

쿼리만 바뀌는 이동(같은 화면에 머문 채, 예: 목록 검색)은 예전처럼 재마운트하지 않는다. **[검증]**

### 4-2. 뒤로가기만 보존하는 구역 — `freshOnNavigation`

탐색 화면: 홈 · 목록 · 카테고리 · 검색 · 상세 · 공지 · FAQ · 약관 같은 읽기 화면.

```tsx
import { freshOnNavigation } from '@/components';

async function ProductsListPage(props: PageProps<'/[locale]/products'>) { ... }

export default freshOnNavigation(ProductsListPage);
```

이 화면들에서만 §5 의 판단 절차가 필요하다. `noRoutePreserve` 쪽은 떠나는 순간 통째로 초기화되므로 화면별 처리가 필요 없다.

---

## 5. 보존 구역에서 화면을 만들거나 고칠 때

```text
1) 보존되면 이상한 "일시 state"가 있는가?
   (열린 모달·시트, 비밀번호 입력값, 오류 문구, 진행 플래그, 1회성 ref)
   └ 예 → useResetOnHide(() => { ... }) 로 숨김 때 되돌린다.

2) effect 가 재표시마다 다시 돌아도 되는가?
   ├ 진입 1회만 의도 → ref 가드
   ├ 재표시마다 다시 도는 게 맞음(구독·폴링·리스너) → 그대로
   └ 분석·조회수 기록 → sessionStorage dedupe

3) document.querySelector / getElementById 로 화면 요소를 찾는가?
   └ 숨겨진 사본이 잡힐 수 있다 → ref 로 바꾸거나 보이는 노드만 고른다
     (node.getClientRects().length > 0)
```

> `useResetOnHide` 의 콜백은 언마운트에서도 돈다. 로컬 state·ref 만 되돌리고 zustand 초기화·라우팅·API 호출은 넣지 않는다.

### 5-1. 뒤로가기로 닫는 오버레이 (`useDismissOnBack`) — 반드시 함께 닫는다

보존 구역에서 `useDismissOnBack` 을 쓰는 시트·모달은 **`useResetOnHide(close)` 를 함께 건다.**

```tsx
const { isOpen, open, close } = useDisclosure();
useDismissOnBack(isOpen, close);
useResetOnHide(close);
```

빼먹으면 시트를 연 채 시트 안 링크로 이동했다가 뒤로 돌아왔을 때 이렇게 된다. **[검증]**

- 시트가 열린 채 다시 보인다(`isOpen` 이 보존됐다).
- **뒤로가기가 시트를 닫지 못한다.** 재표시 때 layout effect 가 핸들러를 다시 등록하지만, 같은 commit 의 `BackButtonHandler` pathname effect(`clearBackStackOnRouteChange`)가 곧바로 지운다.
- 재등록이 history sentinel 을 새로 쌓아 **앞으로가기 기록이 잘리고**, 화면이 안 바뀌는 뒤로가기가 두 번 더 끼어든다.

`useDismissOnBack` 은 숨김 때 모달을 **자동으로 닫지 않는다.** `onClose` 가 라우팅을 하는 인터셉터일 수도 있어 일부러 넣지 않았다 — 닫을지는 화면이 정하고, 닫아야 하는 화면(보존 구역의 일반 모달·시트)은 직접 건다.

`useResetOnHide(close)` 가 있으면 도입 전과 같다 — 뒤로 한 번에 시트 없는 원래 화면, 한 번 더에 이전 화면, 앞으로가기도 그대로. **[검증]** `noRoutePreserve` 구역은 이 처리가 필요 없다(떠날 때 통째로 새로 만든다). **[검증]**

`<Portal>` 로 그린 오버레이는 page 가 숨겨질 때 함께 숨겨지고, `useScrollLock` 의 body 잠금도 풀린다. **[검증]**

### 5-2. 신분이 바뀌는 이동은 하드 이동

로그인·로그아웃·탈퇴 뒤에 `router.replace` 를 쓰면 이전 신분으로 보던 화면이 보존된 채 뒤로가기로 되살아난다. 문서를 새로 연다.

```ts
import { useLocale } from 'next-intl';
import { getPathname } from '@/i18n/navigation';

const locale = useLocale();
window.location.replace(getPathname({ href: '/login', locale }));
```

---

## 6. 공용 도구 상세

### 6-1. `useResetOnHide` — `src/hooks/use-reset-on-hide.ts`

- layout effect cleanup 에서 예약하므로 화면이 다시 보이기 전에 반영된다.
- **마이크로태스크로 한 번 미룬다.** dev 의 StrictMode 는 마운트 직후 effect 를 cleanup → setup 으로 한 번 더 돌린다. 이 둘은 동기로 이어지므로 setup 이 예약을 취소한다. 바로 실행하면 그 재실행을 숨김으로 오인한다. dev 모드에서도 §7 의 시나리오가 프로덕션과 같은 결과다. **[검증]**

### 6-2. `FreshOnNavigation` · `NoRoutePreserve` — `src/components/route-preserve.tsx`

- 둘 다 `bfcacheId` 를 key 에 쓴다. 이 값은 `next/navigation` 의 `useRouter` 에만 있어, **이 값을 읽는 용도로만** `next/navigation` 을 직접 import 한다(i18n navigation 규칙의 예외). 라우팅에는 쓰지 않는다.
- `bfcacheId` 는 가장 가까운 세그먼트 기준이라 page 안에서 읽어야 한다. 그래서 layout 이 아니라 page 의 default export 를 감싸는 HOC(`src/components/fresh-page.tsx`)로 쓴다.
- **layout 에 `key={pathname}` 래퍼를 두는 방식은 쓰지 않는다.** layout 아래 전부(중첩 layout·loading 경계)를 새로 만들어 도입 전보다 넓게 리셋한다. **[원본]**

---

## 7. 이 템플릿에서 검증한 것 (2026-10-14)

**방법.** 임시 probe page 4개(`noRoutePreserve` · `freshOnNavigation` · 감싸지 않음 · `freshOnNavigation` + `useResetOnHide(close)`)를 만들고, 도입 전(`master`)과 도입 후를 각각 프로덕션 빌드(`next build` → `next start`)로 띄워 헤드리스 크롬에서 같은 조작을 스크립트로 실행해 비교했다. dev 모드(StrictMode)에서도 전부 다시 돌렸다. probe page 는 검증 뒤 지웠다.

| 시나리오                                                    | 도입 전             | `noRoutePreserve` | `freshOnNavigation`         | 감싸지 않음                 |
| ----------------------------------------------------------- | ------------------- | ----------------- | --------------------------- | --------------------------- |
| 카운터·입력·체크를 바꾸고 스크롤 1500 → 다른 화면 → 뒤로    | 초기화, 스크롤 1500 | 동일              | **state 유지**, 스크롤 1500 | state 유지                  |
| 같은 흐름에서 앞으로 → 다시 뒤로                            | 초기화              | 동일              | state 유지                  | state 유지                  |
| `?v=1` 에서 state 변경 → 다른 화면 → `?v=2` 링크로 재진입   | prop 2 · state 2    | 동일              | 동일                        | **prop 2 · state 1 (버그)** |
| 같은 쿼리 링크로 재진입                                     | 새로 시작           | 동일              | 동일                        | 옛 state 그대로             |
| 같은 화면에 머문 채 쿼리만 바꾸는 링크                      | 재마운트 없음       | 동일              | 동일                        | 동일                        |
| 시트를 열고 뒤로 → 한 번 더 뒤로                            | 닫힘 → 이전 화면    | 동일              | 동일                        | 동일                        |
| 시트를 연 채 시트 안 링크로 이동 → 뒤로 → 뒤로 → 앞으로 2회 | 정상                | 동일              | **§5-1 의 문제**            | §5-1 의 문제                |
| 위와 같되 `useResetOnHide(close)` 추가                      | —                   | —                 | 도입 전과 동일              | —                           |

- 데모 홈: 닉네임 입력 → 언어 전환 링크 → 뒤로 = 입력 유지(도입 전에는 빈 값), 링크로 재진입 = 빈 값(도입 전과 동일).
- 로케일 전환: `/` → English 링크 → 뒤로 → 앞으로 → 한국어 링크 → English 링크, `/en` 직접 진입 → 한국어 링크 → English 링크. 모든 단계에서 URL·`<html lang>`·서버 번역 제목이 일치한다(도입 전과 동일). `request.ts` 를 `requestLocale` 로 두면 제목이 한 박자씩 이전 로케일로 남는다(§3-7).
- Server Action·Route Handler 안의 `getServerAppTranslation()` 은 도입 전과 같은 로케일을 돌려준다.
- `/api/ping` 은 요청마다 새 시각을 돌려주고 빌드 출력에서 `ƒ` 다.
- 빌드 출력: page·`/api/ping` 이 `ƒ`, `/_not-found`·`/robots.txt`·`/sitemap.xml` 이 `○` — 도입 전과 같다(`sitemap.xml` 은 §3-6 의 처리 뒤).
- dev 모드: 위 시나리오가 프로덕션과 같은 결과이고 콘솔·서버 로그에 오류가 없다.
- ESLint: `export default function`, `export default async function`, default export 없음, 다른 HOC 로 감싼 경우를 모두 오류로 잡고, 두 HOC 로 감싼 page 는 통과한다.

**확인하지 못한 것:** 앱(WebView) 실기기 — 안드로이드 하드웨어 뒤로가기(`consumeBack` 브릿지), iOS 스와이프 백, 메모리. Vercel 배포 환경의 응답 헤더. 화면이 4개 이상 쌓여 가장 오래된 화면이 버려지는 경우.


### 7-1. 도입 뒤 후속 수정 (2026-10-14)

파생 프로젝트들(아나나몰 · 남대문리뷰 등)의 운영 배포와 react-user-web 원본의 2·3차 점검(`b5a9adf1c` · `a8984e4a3`)에서 나온 것 가운데 템플릿에 해당하는 것을 넣었다.

- **bfcache 되살림** — 도입 전 HTML 은 `private, no-cache, no-store` 였는데 도입 뒤 Vercel 이 `public, max-age=0, must-revalidate` 로 내보낸다(파생 프로젝트 운영 실측). 크롬이 떠난 문서를 통째로 보관했다 뒤로가기에 되살린다 — 아나나몰 운영에서 외부 사이트로 갔다 뒤로 오자 `pageshow` 의 `persisted === true`, 페이지 JS 변수까지 그대로였다. 로그인 · 가입 · 탈퇴 같은 문서 이동 뒤 옛 신분 · 상태의 화면이 뜨지 않도록, 되살린 경우에만 다시 받는 `BfcacheReload`(`src/components/bfcache-reload.tsx`)를 루트 layout 에 뒀다. 로컬 `next start` 는 no-store 라 재현되지 않는다 — `pageshow` 에 `persisted: true` 이벤트를 직접 보내 reload 되는지로 확인했다.
- **서버 시간** — `useServerNow` 가 오차를 effect 실행 시점의 `Date.now()` 로 계산해, 숨겨졌다 다시 보인 화면에서 effect 가 몇 분 전에 받은 서버 시간으로 다시 돌아 시계 · 카운트다운이 재요청 응답 전까지 숨겨진 시간만큼 되감겼다(원본에서 실측). 받은 시점(`dataUpdatedAt`) 기준으로 바꿨다.
- 원본의 나머지(같은 경로 쿼리 이동의 `useState(initial)` 입력, 재표시 때 새로 만들어지는 Swiper · 지도, 재표시 commit 의 back 핸들러 등)는 템플릿에 해당 화면이 없거나 §5-1 로 이미 막았다. 파생 프로젝트에서 그런 화면을 만들면 §10 함정 18~19 를 본다.
---

## 8. 파생 프로젝트에서 해야 할 일

이 템플릿에는 데모 홈 하나뿐이라 아래는 적용할 대상이 없었다. 화면을 만들면서 채운다.

1. **화면을 분류한다.** 새 page 마다 §4 의 둘 중 하나로 감싼다. 장바구니·주문서·마이페이지·어드민·폼은 `noRoutePreserve`, 읽기 화면은 `freshOnNavigation`.
2. **로그인·로그아웃·탈퇴를 하드 이동으로 만든다**(§5-2). 인증을 붙일 때 `router.replace` 로 쓰지 않는다.
3. **새 GET 핸들러에 `await connection()`**(§3-3). 빌드 출력에서 `○` 가 된 API 가 없는지 본다.
4. **route segment config 를 쓰지 않는다**(§3-2).
5. **로케일·테넌트처럼 URL 로 갈리는 값은 `params`·루트 param 에서 읽는다**(§3-7). 서버 번역은 `getServerAppTranslation()` 을 그대로 쓰면 된다.
6. **루트 layout 에서 세션·헤더를 읽게 되어도** `instant = false` 가 이미 있으니 그대로 둔다(§3-1).
7. **보존 구역의 오버레이에 `useResetOnHide(close)`**(§5-1). 분석·조회수 기록은 sessionStorage dedupe.
8. **검증한다.** `noRoutePreserve` page 는 상태를 바꾸고 다른 화면에 갔다가 뒤로 → 초기화돼 있는가, **쿼리·서버 값을 바꿔서** 링크로 재진입 → 새 값인가. `freshOnNavigation` page 는 뒤로가기에서 state·스크롤이 유지되고 링크 재진입은 새로 시작하는가. dev 모드에서도 같은가.
9. **앱(WebView)으로 내보낸다면 실기기 메모리를 본다.** 숨겨진 화면 3개 분량의 DOM·이미지가 남는다.
10. **E2E·브라우저 자동화 셀렉터에 가시성을 명시한다.** 숨겨진 화면의 요소가 DOM 에 남아 있다(Playwright 는 `getByRole` 또는 `.filter({ visible: true })`). **[문서]**

---

## 9. 되돌리기

`next.config.ts` 의 `cacheComponents`·`partialPrefetching`·`experimental.hideLogsAfterAbort`·`experimental.instantInsights` 를 지우면 보존이 꺼진다. 그때는 루트 레이아웃의 `instant = false`(Cache Components 전용 export)도 함께 지운다.

`noRoutePreserve`·`freshOnNavigation`·`useResetOnHide`·`connection()`·`generateStaticParams`·하드 이동·ESLint 규칙은 플래그가 꺼져 있어도 해가 없어 그대로 둬도 된다.

---

## 10. 함정 모음

1. **새 page 의 default export 를 `freshOnNavigation`·`noRoutePreserve` 로 감싸지 않으면 링크 재진입에서도 보존된다.** `useState(initialX)` 가 서버의 새 값을 받지 않는다(§4).
2. **`bfcacheId` 는 page 안에서 읽어야 한다.** layout·template 에서는 상위 세그먼트의 id 가 나온다.
3. **`runtime` export 는 `'nodejs'` 여도 빌드 오류다.** 문서와 다르다(§3-2).
4. **루트가 동적 세그먼트면 `generateStaticParams` 가 필요하다**(§3-1).
5. **요청 데이터를 안 읽는 GET 핸들러는 프리렌더 대상이다.** `await connection()`.
6. **현재 시각·난수 앞에는 `await connection()`.** `cookies()`·`searchParams` 뒤에 두는 것은 빌드만 통과하고 dev 에서 오류다(§3-4).
7. **"1회만" ref 가드는 보존 구역에서 초기화되지 않는다.** `useResetOnHide` 로 푼다.
8. **재표시마다 effect 가 다시 돈다.** 마운트 시점 스냅샷을 다시 적용하는 effect 는 그 뒤의 변경을 덮어쓴다(무한 스크롤 목록이 그랬다). **[원본]**
9. **StrictMode 와 숨김은 cleanup → setup 순서가 같다.** 숨김 감지는 마이크로태스크 토큰으로 구분한다(§6-1).
10. **`document.querySelector`·`getElementById`·`:has()` 는 숨겨진 사본을 잡는다.**
11. **신분이 바뀌는 이동을 SPA 전환으로 하면 이전 신분의 화면이 되살아난다.** 하드 이동.
12. **브라우저 자동화·E2E 셀렉터가 숨겨진 요소를 잡는다.** 가시성을 명시한다. **[문서]**
13. **숨겨질 때만 새로 만들면 옛 서버 값으로 state 가 굳는다.** 보존하지 않는 화면은 숨김 때(`epoch`)와 링크 재진입 때(`bfcacheId`) 둘 다 새로 만들어야 한다(§4-1). 하나만으로 통과하는 테스트(같은 값으로 재진입)에 속지 않는다 — 쿼리·데이터를 바꿔서 재진입해 본다.
14. **보존 구역에서 `useDismissOnBack` 오버레이를 연 채 떠나면 뒤로가기가 망가진다.** `useResetOnHide(close)` 를 함께 건다(§5-1).
15. **루트 layout 의 `instant = false` 는 dev 의 page 검증을 끄지 않는다.** `validationLevel: 'manual-warning'` 이 그 역할이다(§3-5).
16. **`params` 를 읽지 않는 page 의 서버 출력은 모든 param 값이 공유한다.** 헤더·미들웨어로 넘긴 값으로 URL 별 내용을 가르면 다른 URL 의 내용이 나온다. 로케일은 `next/root-params` 로 읽는다(§3-7).
17. **`next dev` 가 `AGENTS.md` 맨 위의 `nextjs-agent-rules` 블록을 다시 쓴다.** 작업과 무관한 diff 다. 끄려면 `next.config.ts` 에 `agentRules: false`.
18. **HTML 이 더는 `no-store` 가 아니다.** 브라우저가 떠난 문서를 bfcache 에 보관해 뒤로가기에 되살린다 — `BfcacheReload` 를 루트 layout 에서 빼지 않는다(§7-1).
19. **effect 에서 "받은 값 + 지금 시각"으로 계산하면 재표시 때 옛 값으로 다시 계산된다.** 받은 시점을 함께 저장해 계산한다(`useServerNow`, §7-1). 같은 경로에서 쿼리만 바뀌는 이동은 다시 마운트되지 않으니, 쿼리 값으로 `useState` 를 초기화한 입력은 `key` 를 쿼리 값으로 준다.

---

## 참고

- Next 문서 (`node_modules/next/dist/docs/01-app/`)
  - `02-guides/migrating-to-cache-components.md` · `02-guides/preserving-ui-state.md`
  - `02-guides/instant-navigation.md`
  - `03-api-reference/05-config/01-next-config-js/cacheComponents.md` · `partialPrefetching.md`
  - `03-api-reference/03-file-conventions/02-route-segment-config/instant.md`
  - `03-api-reference/04-functions/use-router.md` — `bfcacheId`
  - `03-api-reference/04-functions/next-root-params.md` · `02-guides/adopting-partial-prefetching.md`
- 연관 코드: `src/components/route-preserve.tsx`, `src/components/fresh-page.tsx`, `src/hooks/use-reset-on-hide.ts`, `src/hooks/use-dismiss-on-back.ts`, `src/core/back-stack/`, `src/i18n/request.ts`, `eslint.config.mjs`
