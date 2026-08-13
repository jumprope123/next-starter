/**
 * 하단 탭 네비게이터 사이의 lateral(좌/우) 슬라이드 방향 판정.
 *
 * 탭 ↔ 탭 이동은 depth 개념이 없는 sibling 전환이라 push/pop 슬라이드 대신
 * 탭의 상대 위치 기반 lateral 슬라이드를 쓴다. Link 클릭 경로(navigation-link 의 명시
 * `transitionTypes`)와 popstate 경로(popstate-view-transition) 가 같은 판정을 공유한다.
 */

/**
 * 하단 탭의 좌→우 순서. 프로젝트에 탭 네비게이터가 생기면 ROUTE_PATHS 로 채운다.
 * 비어 있으면 `getTabLateralDirection` 은 항상 null → lateral 판정 없이 히스토리 방향 사용.
 *
 * @example
 * export const TAB_ORDER: readonly string[] = [ROUTE_PATHS.HOME, ROUTE_PATHS.SEARCH, ROUTE_PATHS.MY_PAGE];
 */
export const TAB_ORDER: readonly string[] = [];

export type TabLateralDirection = 'nav-lateral-left' | 'nav-lateral-right';

/**
 * 출발/도착이 모두 탭 루트일 때 이동 방향의 lateral 타입을 돌려준다. 아니면 null.
 * - 오른쪽 탭으로 이동 → `nav-lateral-right` (새 화면이 오른쪽에서 슬라이드 인)
 * - 왼쪽 탭으로 이동 → `nav-lateral-left`
 */
export function getTabLateralDirection(fromPath: string, toPath: string): TabLateralDirection | null {
  if (fromPath === toPath) return null;
  const fromIdx = TAB_ORDER.indexOf(fromPath);
  const toIdx = TAB_ORDER.indexOf(toPath);
  if (fromIdx < 0 || toIdx < 0) return null;
  return toIdx > fromIdx ? 'nav-lateral-right' : 'nav-lateral-left';
}
