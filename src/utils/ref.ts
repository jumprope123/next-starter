import { MutableRefObject, Ref } from 'react';

/**
 * 여러 개의 React `Ref` 를 하나로 합쳐 단일 ref 콜백을 반환한다.
 *
 * 같은 DOM 노드에 대해 외부에서 전달받은 `forwardRef` 와 내부에서 사용하는 로컬 ref 등을
 * 동시에 연결할 때 사용한다. 콜백 ref 와 객체 ref 모두 지원하며, `undefined` 인 ref 는
 * 무시한다. 반환된 ref 는 React 가 마운트 / 언마운트 시 자동으로 호출한다.
 *
 * @example
 * const Combo = forwardRef<HTMLInputElement>((props, forwardedRef) => {
 *   const localRef = useRef<HTMLInputElement>(null);
 *   return <input ref={mergeRefs(localRef, forwardedRef)} {...props} />;
 * });
 */
export const mergeRefs = <T>(...refs: (Ref<T> | undefined)[]): Ref<T> => {
  return (element: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref && 'current' in ref) {
        (ref as MutableRefObject<T | null>).current = element;
      }
    });
  };
};
