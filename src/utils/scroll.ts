/**
 * 페이지 전체 스크롤을 잠그거나 해제하는 헬퍼.
 *
 * `<html>` 요소의 `overflow` 스타일을 직접 제어하기 때문에, 모달이나 풀스크린
 * 오버레이를 띄울 때 배경 스크롤을 막는 용도로 사용한다. SSR 환경에서는
 * `document` 가 존재하지 않으므로 `lock()` / `unlock()` 모두 no-op 으로 동작한다.
 */
const scroll = {
  /**
   * `<html>`에 `overflow: hidden`을 적용해 페이지 스크롤을 잠근다.
   * SSR 환경(`typeof document === 'undefined'`)에서는 아무 일도 하지 않는다.
   */
  lock: () => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.overflow = 'hidden';
  },

  /**
   * `lock()`이 설정한 인라인 `overflow` 스타일을 제거해 스크롤을 복원한다.
   * SSR 환경에서는 아무 일도 하지 않는다.
   */
  unlock: () => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.removeProperty('overflow');
  },
};

export default scroll;
