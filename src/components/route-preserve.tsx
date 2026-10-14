'use client';

import { Fragment, useState, type ReactNode } from 'react';
// bfcacheId 는 next/navigation 의 useRouter 에만 있다 — 이 값을 읽는 용도로만 직접 import 한다 (라우팅에는 쓰지 않는다).
import { useRouter } from 'next/navigation';
import { useResetOnHide } from '@/hooks/use-reset-on-hide';

type Props = Readonly<{ children: ReactNode }>;

/**
 * 링크·`router.push` 로 새로 들어올 때마다 하위 트리를 새로 마운트한다. 뒤로/앞으로 복귀는 보존된다.
 *
 * Cache Components 는 떠난 화면을 숨겨 두었다가 같은 경로로 다시 들어오면 그대로 되살린다.
 * 이 템플릿의 정책은 "뒤로가기만 보존" 이라, 탐색 화면(목록·상세·검색 등)의 page 를 이걸로 감싼다.
 * `bfcacheId` 는 가장 가까운 세그먼트 기준이므로 **page 안**에 두어야 한다 (layout 에 두면 layout 의 id 를 읽는다).
 */
export function FreshOnNavigation({ children }: Props) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}

/**
 * 이 화면은 보존하지 않는다 — Cache Components 도입 전처럼 들어올 때마다 새로 마운트한다.
 *
 * 주문서·장바구니·마이페이지·어드민처럼 "떠나면 초기화"가 전제인 화면의 **page 안**에 둔다
 * (`noRoutePreserve(Page)` 로 default export 를 감싸는 형태로 쓴다). page 범위만 리셋한다 — layout·loading 경계는 건드리지 않는다.
 *
 * key 의 두 부분이 각각 다른 경우를 맡는다. **둘 다 있어야 한다.**
 * - `epoch` (숨겨질 때 +1) — 뒤로/앞으로 돌아왔을 때 state 가 남지 않게 한다. 이 이동에서는 `bfcacheId` 가 그대로라 이것만이 리셋한다.
 * - `bfcacheId` (링크·`router.push` 로 새로 들어올 때 바뀜) — 숨겨질 때 새로 만든 트리는 **그 시점의 서버 props** 로
 *   `useState(initialX)` 를 초기화한 상태다. 다른 쿼리나 새 데이터로 다시 들어오면 그 state 는 옛 값이므로,
 *   들어오는 시점에 한 번 더 새로 만든다. 이게 없으면 `/checkout?items=A` 를 떠났다가 `/checkout?items=B` 로 들어왔을 때
 *   주문서가 A 품목을 보여 주고 A 를 주문한다 (이 템플릿의 원본 프로젝트에서 실제로 재현된 버그).
 * 쿼리만 바뀌는 이동(같은 화면에 머문 채)은 예전처럼 재마운트하지 않는다.
 */
export function NoRoutePreserve({ children }: Props) {
  const { bfcacheId } = useRouter();
  const [epoch, setEpoch] = useState(0);
  useResetOnHide(() => setEpoch((n) => n + 1));
  return <Fragment key={`${bfcacheId}:${epoch}`}>{children}</Fragment>;
}
