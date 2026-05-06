/**
 * `switch` 문의 모든 분기를 처리했음을 컴파일러에 증명한다.
 *
 * 새로운 케이스가 union 에 추가되면 `assertNever` 호출이 곧바로 타입 오류로 잡혀서, 누락된 분기를
 * 빠르게 발견할 수 있다. 런타임에 도달하면 `Error` 를 던진다.
 *
 * @example
 * switch (status) {
 *   case 'idle':    return ...;
 *   case 'success': return ...;
 *   case 'error':   return ...;
 *   default:        return assertNever(status);
 * }
 */
export const assertNever = (value: never, message?: string): never => {
  throw new Error(message ?? `Unhandled discriminated union member: ${JSON.stringify(value)}`);
};

/**
 * `unknown` 값이 일반 객체(`Record<string, unknown>`) 인지 좁힌다.
 *
 * `null` / 배열 / 함수 / 원시 타입은 제외하고 plain object 만 허용한다.
 * JSON 파싱 결과나 외부 응답을 다룰 때 자주 사용한다.
 */
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `value` 가 `null` 또는 `undefined` 가 아닌지 좁힌다 (Array.filter 의 type guard 용도로 자주 사용). */
export const isNotNullish = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;
