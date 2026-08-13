/**
 * history entry 위치 인덱스 스탬프의 key 와 reader.
 *
 * 스탬프 자체는 `@/core/view-transition/popstate-view-transition.tsx` 의
 * `installHistoryIndexPatch` 가 `history.pushState/replaceState` 를 감싸 매 entry 에 박는다.
 * back-stack 은 이 값을 읽어 "아직 sentinel entry 위에 서 있는지" 를 판정한다
 * (`isStillOnSentinelEntry`) — 마커가 replaceState 로 지워져도 위치 인덱스로 되짚기 위함.
 *
 * 별도 모듈로 분리한 이유: back-stack 과 view-transition 이 서로의 barrel 을 통해 import 하면
 * 순환이 생기므로, 양쪽이 공유하는 최소 조각만 여기 둔다.
 */

export const HISTORY_IDX_KEY = '__appHistoryIdx';

/** 현재 history entry 에 스탬프된 위치 인덱스. 미스탬프/SSR 이면 null. */
export function getHistoryEntryIndex(): number | null {
  if (typeof window === 'undefined') return null;
  const state = window.history.state as Record<string, unknown> | null;
  if (!state || typeof state !== 'object') return null;
  const idx = state[HISTORY_IDX_KEY];
  return typeof idx === 'number' ? idx : null;
}
