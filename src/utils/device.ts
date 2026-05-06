/**
 * 현재 디바이스가 터치 입력을 지원하는지 추정한다.
 *
 * `'ontouchstart' in window` 또는 `navigator.maxTouchPoints > 0` 중 하나라도
 * 만족하면 터치 디바이스로 판단한다. 윈도우 노트북처럼 터치 + 마우스를 동시에
 * 가진 하이브리드 환경에서도 `true` 를 반환할 수 있으므로, "마우스 호버를 쓸 수 없는
 * 환경" 을 식별하려는 용도로는 적합하지 않다.
 *
 * 클라이언트 전용 함수이며 SSR 환경에서 호출하면 `window` 참조 에러가 발생한다.
 */
export const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
