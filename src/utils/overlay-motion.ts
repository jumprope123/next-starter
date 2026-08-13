/**
 * 오버레이(BottomSheet · Dialog) 모션의 JS 쪽 상수.
 *
 * 실제 duration/easing 은 `@/styles/overlay-motion.css` 의 CSS 변수가 단일 출처이고,
 * 여기 값은 "애니메이션이 끝난 뒤 언마운트" 타이머일 뿐이다 — CSS 의 out duration 을
 * 줄이거나 늘리면 아래 값도 그 이상으로 맞춘다.
 */

/** --app-sheet-out-duration(240ms) + 여유 */
export const SHEET_EXIT_DURATION_MS = 260;

/** --app-dialog-out-duration(160ms) + 여유 */
export const DIALOG_EXIT_DURATION_MS = 200;

/**
 * 다음 페인트 이후 콜백 실행 (double rAF + 타임아웃 폴백).
 *
 * 진입 애니메이션은 "닫힌 상태가 한 번 그려진 뒤" 열린 상태로 바꿔야 transition 이 걸린다.
 * 고정 지연(100ms)을 주던 자리를 대체 — 한 프레임만 기다리므로 그만큼 빨리 뜬다.
 * 다만 문서가 백그라운드면 rAF 가 멈추므로, 열린 상태로 넘어가지 못한 채 갇히지 않도록
 * 타임아웃 폴백을 함께 건다 (둘 중 먼저 오는 쪽 1 회만 실행). 반환값은 취소 함수.
 */
export const afterNextPaint = (callback: () => void) => {
  let done = false;
  let inner = 0;

  const run = () => {
    if (done) return;
    done = true;
    callback();
  };

  const outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(run);
  });
  const fallback = setTimeout(run, 100);

  return () => {
    done = true;
    cancelAnimationFrame(outer);
    if (inner) cancelAnimationFrame(inner);
    clearTimeout(fallback);
  };
};
