/**
 * 값을 `[min, max]` 범위로 강제로 잘라낸다.
 *
 * - `value < min` → `min`
 * - `value > max` → `max`
 * - 그 외에는 입력 그대로 반환.
 *
 * `min > max` 인 경우는 보정하지 않으므로 호출 측이 올바른 범위를 전달해야 한다.
 *
 * @example
 * clamp(10, 0, 5);   // → 5
 * clamp(-3, 0, 100); // → 0
 */
export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * `start` 부터 `end - 1` 까지 정수로 채운 배열을 만든다 (`step` 단위).
 *
 * - 한 인자만 주면 `range(0, n)` 으로 해석된다 (`Array.from({ length: n }, (_, i) => i)` 와 같음).
 * - `step` 은 양수여야 하며, 그렇지 않으면 무한루프 방지를 위해 빈 배열을 돌려준다.
 *
 * @example
 * range(3);        // [0, 1, 2]
 * range(2, 5);     // [2, 3, 4]
 * range(0, 10, 2); // [0, 2, 4, 6, 8]
 */
export const range = (startOrEnd: number, end?: number, step: number = 1): number[] => {
  const start = end === undefined ? 0 : startOrEnd;
  const stop = end === undefined ? startOrEnd : end;
  if (step <= 0) return [];

  const result: number[] = [];
  for (let i = start; i < stop; i += step) result.push(i);
  return result;
};

/**
 * `[a, b]` 구간 안에서 `t` (0~1) 비율의 선형 보간 값을 돌려준다.
 *
 * - `t = 0` 이면 `a`, `t = 1` 이면 `b`. 그 사이는 비례.
 * - `t` 가 0..1 범위를 벗어나면 외삽(extrapolation) 결과가 반환된다 — 0..1 로 자르고 싶으면 `clamp(t, 0, 1)` 후 호출.
 *
 * 애니메이션, 점진 색상 변화, 차트 보간 등에 사용한다.
 */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
