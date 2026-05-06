import { KeyboardEvent } from 'react';

/**
 * 입력 필드에서 "단순 Enter 입력" 을 식별한다.
 *
 * 다음 조건을 모두 만족할 때만 `true` 를 반환한다.
 *  - `e.key === 'Enter'`
 *  - 한국어/일본어 IME 조합 중이 아님 (`isComposing === false`)
 *  - Shift 키가 눌려 있지 않음 (Shift+Enter 는 줄바꿈 의도로 보고 무시)
 *
 * IME 조합 중 Enter 는 글자 확정 동작이므로 폼 제출이나 검색 실행이 의도되지 않는다.
 * 이 헬퍼는 그 케이스를 정확히 걸러 준다.
 *
 * @example
 * <input onKeyDown={(e) => { if (isEnter(e)) handleSubmit(); }} />
 */
export const isEnter = (e: KeyboardEvent) => e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey;
