import { ViewTransition, type ReactNode } from 'react';

/**
 * 방향성 페이지 전환 래퍼 — 모든 페이지가 공유하는 단일 출처.
 *
 * ## 쓰는 법
 *
 * `page.tsx` 의 **최상단 요소**로 감싼다. `<Link transitionTypes={['nav-forward']}>` /
 * `router.push(href, { transitionTypes: ['nav-back'] })` 가 붙인 타입에 따라 좌/우 슬라이드가 선택된다.
 *
 * ```tsx
 * export default function Page() {
 *   return (
 *     <PageTransition>
 *       <main>...</main>
 *     </PageTransition>
 *   );
 * }
 * ```
 *
 * ## 지켜야 할 규칙 (어기면 조용히 동작하지 않는다)
 *
 * 1. **layout 이 아니라 page 에 둔다.** layout 은 네비게이션 사이에 그대로 살아 있어서
 *    enter / exit 가 아예 발화하지 않는다. 또한 layout 에서 `{children}` 을 VT 로 감싸면
 *    페이지의 VT 가 부모와 한 덩어리로 마운트/언마운트되어 **페이지 쪽 enter/exit 가 죽는다.**
 * 2. **VT 앞에 DOM 노드를 두지 않는다.** `<div><PageTransition>...` 처럼 감싸면 enter/exit 가 억제된다.
 * 3. **enter 와 exit 를 항상 짝으로 준다.** exit 가 없으면 옛 페이지가 즉시 사라지고 새 페이지만 밀려든다.
 * 4. **`default: 'none'` 을 유지한다.** 없으면 Suspense 해제 · 백그라운드 재검증 등 모든 transition 에서
 *    전환이 발화해 서로 경쟁한다.
 * 5. **방향 슬라이드는 계층 이동에만.** 탭 간 이동처럼 수평적인 전환은 크로스페이드를 쓴다
 *    (`transitionTypes` 를 붙이지 않으면 `default: 'none'` 으로 떨어져 무전환이 된다).
 *
 * 브라우저 back/forward 버튼과 `router.back()` 은 transition type 을 싣지 않으므로 방향 슬라이드가
 * 재생되지 않는다(= `default: 'none'`). 이름이 붙은 공유 요소 morph 는 그대로 동작한다.
 *
 * CSS 는 `@/styles/view-transitions.css` 의 `.nav-forward` / `.nav-back` 이 출처다.
 */
export function PageTransition({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
