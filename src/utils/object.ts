import { ComponentType } from 'react';

/**
 * 객체에서 지정한 키들만 골라 새 객체를 만든다.
 *
 * - 입력 객체는 변경하지 않는다 (immutable).
 * - 지정한 키가 입력 객체에 없으면 결과에서도 제외된다 (`undefined` 키 자체가 빠진다).
 *
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // → { a: 1, c: 3 }
 */
export const pick = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
};

/**
 * 객체에서 지정한 키들을 제거한 새 객체를 만든다.
 *
 * - 입력 객체는 변경하지 않는다 (immutable).
 * - 제거 키 목록에 포함된 항목만 빠진다.
 *
 * @example
 * omit({ a: 1, b: 2, c: 3 }, ['b']); // → { a: 1, c: 3 }
 */
export const omit = <T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
};

/**
 * 값이 `undefined` 인 키를 모두 제거한 새 객체를 만든다.
 *
 * `null` 은 제거하지 않으므로, "값이 명시적으로 비어 있다" 와 "키가 아예 없다" 를 구분해야 하는
 * API 호출 / URLSearchParams 직렬화 등에 사용한다.
 */
export const removeUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};

/**
 * 두 객체가 동일한 키 집합을 가지며 각 키의 값이 정확히 같은지(`===`) 비교한다.
 *
 * 얕은 비교(shallow equality) 만 수행하므로 중첩 객체나 배열은 참조가 같아야 동일하게
 * 본다. 깊은 비교가 필요하다면 별도의 라이브러리를 사용해야 한다.
 *
 * @returns 모든 키와 값이 일치하면 `true`
 */
export const compareAllKeys = <T extends Record<string, unknown>>(obj1: T, obj2: T): boolean => {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};

/**
 * 객체의 모든 값이 "비어 있지 않은지" 검사한다.
 *
 * 다음 값을 모두 "비어 있음"으로 판정해 `false` 를 반환한다.
 *  - `null` 또는 `undefined`
 *  - 공백만으로 이루어진 문자열
 *  - 길이가 0 인 배열
 *  - 키가 하나도 없는 객체
 *
 * 모든 값이 위 조건을 통과해야만 `true` 를 반환한다. 객체 자체에 키가 없으면 `false`.
 * 폼 제출 가능 여부 같은 검사에 사용한다.
 */
export const hasAllValues = <T extends Record<string, unknown>>(obj: T): boolean => {
  if (!Object.values(obj).length) {
    return false;
  }

  return Object.values(obj).every((value) => {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return false;
    }

    if (Array.isArray(value) && value.length === 0) {
      return false;
    }

    if (typeof value === 'object') {
      // Map / Set 은 크기로 판정한다 (`Object.keys` 는 항상 빈 배열).
      if (value instanceof Map || value instanceof Set) return value.size > 0;
      // Date / File / Blob / 클래스 인스턴스처럼 열거 가능한 키가 없는 내장 객체는
      // "값이 있다" 로 본다 — 예전 구현은 `new Date()` 를 빈 값으로 오판해
      // 생년월일 하나만 있어도 폼 제출이 영영 막혔다.
      const prototype = Object.getPrototypeOf(value) as object | null;
      const isPlainObject = prototype === Object.prototype || prototype === null;
      if (isPlainObject && Object.keys(value).length === 0) return false;
    }

    return true;
  });
};

/**
 * 컴포넌트 함수에 정적 서브 컴포넌트를 부착해 `Parent.Child` 형태로 노출한다.
 *
 * `Object.defineProperty` 로 read-only 프로퍼티를 추가하므로 외부에서 덮어쓰기/삭제가
 * 불가능하다. 이미 같은 이름의 키가 부모에 존재하면 충돌을 피하기 위해 추가하지 않는다.
 *
 * @example
 * const Card = (props) => <div {...props} />;
 * const Header = () => <h1>...</h1>;
 * export default withSubComponents(Card, { Header });
 * // → <Card.Header />
 */
export const withSubComponents = <T extends ComponentType<never>, Sub extends Record<string, unknown>>(
  component: T,
  subComponents: Sub
) => {
  const result = component as T & { readonly [K in keyof Sub]: Sub[K] };

  for (const key in subComponents) {
    if (Object.prototype.hasOwnProperty.call(result, key)) continue;

    Object.defineProperty(result, key, {
      value: subComponents[key],
      writable: false,
      configurable: false,
      enumerable: true,
    });
  }

  return result;
};
