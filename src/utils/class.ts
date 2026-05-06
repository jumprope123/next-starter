import { twMerge } from 'tailwind-merge';
import { ClassValue, clsx } from 'clsx';

/**
 * `clsx` 와 `tailwind-merge` 를 결합한 className 헬퍼.
 *
 * - `clsx` 로 다양한 형태(문자열, 객체, 배열, 조건부)를 평탄한 클래스 문자열로 합친다.
 * - `tailwind-merge` 로 동일 카테고리(예: `px-2`, `px-4`)에서 충돌하는 Tailwind 유틸리티를
 *   뒤에 오는 것이 이기도록 정리한다.
 *
 * 컴포넌트의 기본 클래스에 사용자가 전달한 `className` 을 안전하게 합칠 때 표준적으로 사용한다.
 *
 * @example
 * cn('px-2 py-1', isActive && 'bg-blue-500', { 'opacity-50': disabled }, className)
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
