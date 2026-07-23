'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ComponentProps, useId } from 'react';
import { cn } from '@/utils';

type Props = Omit<ComponentProps<'div'>, 'children'> & {
  value: number;
};

/**
 * 숫자 값이 변할 때 위로 슬라이드 + 페이드 애니메이션으로 전환되는 두 자리 카운터.
 *
 * - 값은 항상 두 자리 0-패딩 (예: `7` → `"07"`).
 * - `value` 가 바뀌면 framer-motion 의 `AnimatePresence` 가 이전 숫자를 아래로 밀어내고
 *   새 숫자를 위에서 슬라이드해 들여온다 (`key` 변경 기반, 0.25s).
 * - `useId` 로 동일 키 충돌을 방지하므로 같은 값이 다시 들어와도 정상적으로 재애니메이션 된다.
 *
 * 카운트다운 타이머의 분/초 자리 표시처럼 "두 자리 숫자가 바뀌는 자리"에 사용한다.
 */
export function AnimatedTimer({ value, className, ...props }: Readonly<Props>) {
  const componentId = useId();

  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`animated-digit-${componentId}-${value}`}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto w-max"
        >
          {String(value).padStart(2, '0')}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
