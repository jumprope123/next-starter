/**
 * 다양한 형태의 truthy 값을 엄격하게 `true` 로 판정한다.
 *
 * 쿼리스트링 / 환경 변수 / 폼 데이터처럼 boolean 이 문자열이나 숫자로 들어오는 입력에서
 * `true` 만 안전하게 골라내고자 할 때 사용한다.
 *
 * - `true` (boolean)
 * - `'true'` (문자열, 대소문자 정확히 일치해야 함)
 * - `1` (숫자)
 *
 * 그 외의 모든 값은 `false` 로 판정된다 (`'TRUE'`, `'1'`, `1n` 등 포함).
 */
export const isTrue = (value: unknown) => value === true || value === 'true' || value === 1;
