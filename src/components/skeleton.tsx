import ReactLoadingSkeleton from 'react-loading-skeleton';
import { ComponentProps } from 'react';
import { cn } from '@/utils';

type Props = ComponentProps<typeof ReactLoadingSkeleton>;

/**
 * `react-loading-skeleton` 의 얇은 래퍼.
 *
 * 컨테이너에 항상 `display: flex` 가 적용되도록 `containerClassName` 의 기본값을 추가한다.
 * 그 외 props 는 원본 컴포넌트로 그대로 전달된다 (`count`, `width`, `height`, `circle`, `borderRadius` 등).
 */
export function Skeleton({ containerClassName, ...props }: Readonly<Props>) {
  return <ReactLoadingSkeleton containerClassName={cn('flex', containerClassName)} {...props} />;
}
