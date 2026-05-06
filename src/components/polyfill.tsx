'use client';

import 'core-js/actual';

/**
 * core-js 의 모든 폴리필을 클라이언트 번들에 한 번 주입하는 Side-Effect 컴포넌트.
 *
 * 렌더에는 아무 기여도 하지 않으며, 루트 layout 의 최상단에 마운트하기만 하면 된다.
 * `import 'core-js/actual'` 가 모듈 평가 시점에 글로벌 prototype 들을 패치하므로,
 * 동일 페이지에서는 한 번만 마운트되어도 충분하다.
 */
export function Polyfill() {
  return null;
}
