import type { ReactNode } from 'react';
import { FreshOnNavigation, NoRoutePreserve } from './route-preserve';

type PageComponent<P> = (props: P) => ReactNode | Promise<ReactNode>;

/**
 * 모든 page 는 아래 둘 중 하나로 default export 를 감싼다 (docs/cache-components-guide.md §4).
 * 서버 page 의 early return·notFound 를 건드리지 않도록 JSX 가 아니라 export 를 감싸는 형태로 쓴다.
 * 애매하면 `noRoutePreserve` — 도입 전과 같은 동작이라 화면별 처리가 필요 없다.
 *
 * @example
 * async function ProductsPage(props: PageProps<'/[locale]/products'>) { ... }
 * export default freshOnNavigation(ProductsPage);
 */

/** 탐색 화면용 — 링크로 다시 들어오면 새로 시작, 뒤로가기는 보존. */
export function freshOnNavigation<P extends object>(Page: PageComponent<P>) {
  return function FreshPage(props: P) {
    return (
      <FreshOnNavigation>
        <Page {...props} />
      </FreshOnNavigation>
    );
  };
}

/** 거래·마이페이지·어드민용 — 보존하지 않는다. 뒤로가기로 돌아와도 새로 시작한다 (도입 전 동작). */
export function noRoutePreserve<P extends object>(Page: PageComponent<P>) {
  return function UnpreservedPage(props: P) {
    return (
      <NoRoutePreserve>
        <Page {...props} />
      </NoRoutePreserve>
    );
  };
}
