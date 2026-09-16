'use client';

/*
 * 구형 WebView 보정용 폴리필 — **필요한 것만 골라서** 주입한다.
 *
 * 예전에는 `import 'core-js/actual'` 로 전체 폴리필을 넣었는데, 그것만으로 클라이언트 번들이
 * gzip 기준 약 80KB 늘어난다 (실측). 이 템플릿의 타깃은 Next 16 / React 19 가 도는 환경이라
 * ES2020 이하는 이미 전부 지원되며, Next.js 가 browserslist 기준으로 트랜스파일도 해준다.
 * 실제로 부족한 건 비교적 최근에 표준이 된 **런타임 메서드**들뿐이라 그것만 남겼다.
 *
 * 기준: Android WebView 8x~9x / iOS Safari 14~15 대역에서 빠져 있는 항목.
 * 프로젝트에서 더 최신 API 를 쓰게 되면 여기에 한 줄씩 추가한다 (`core-js/actual/<모듈>`).
 * 예: `structuredClone` 을 쓰면 `import 'core-js/actual/structured-clone'` (+6KB gzip),
 *     `Object.groupBy` 면 `import 'core-js/actual/object/group-by'`.
 * 반대로 타깃이 최신 브라우저뿐이라면 이 파일과 core-js 의존성을 통째로 지워도 된다.
 *
 * 실측(gzip, 전체 클라이언트 청크 합계): core-js 전체 509KB / 현재 445KB / core-js 없음 429KB.
 */
import 'core-js/actual/array/at';
import 'core-js/actual/array/find-last';
import 'core-js/actual/array/find-last-index';
import 'core-js/actual/object/has-own';
import 'core-js/actual/promise/any';
import 'core-js/actual/string/at';
import 'core-js/actual/string/replace-all';

/**
 * 폴리필을 클라이언트 번들에 한 번 주입하는 Side-Effect 컴포넌트.
 *
 * 렌더에는 아무 기여도 하지 않으며, 루트 layout 의 최상단에 마운트하기만 하면 된다.
 * 위 import 들이 모듈 평가 시점에 글로벌 prototype 을 패치하므로, 동일 페이지에서는
 * 한 번만 마운트되어도 충분하다.
 */
export function Polyfill() {
  return null;
}
