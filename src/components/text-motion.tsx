'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ReactElement, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils';

type Direction = 'up' | 'down' | 'left' | 'right';

type Props = {
  texts: (string | ReactElement)[];
  interval: number;
  letterSlide?: boolean;
  className?: string;
  motionClassName?: string;
  direction: Direction;
  multiplier: number;
  delayPerChar?: number;
  playOnce?: boolean;
  onCompleteAction?: () => void;
  onChangeIndexAction?: (i: number) => void;
};

function getOffset(direction: Direction, multiplier: number) {
  switch (direction) {
    case 'up':
      return { x: 0, y: -multiplier };
    case 'down':
      return { x: 0, y: multiplier };
    case 'left':
      return { x: -multiplier, y: 0 };
    case 'right':
      return { x: multiplier, y: 0 };
  }
}

/**
 * 여러 개의 텍스트(또는 ReactElement)를 일정 간격(`interval` ms)으로 순환하며 보여 주는 모션 컴포넌트.
 *
 * 동작 요약
 * - `texts` 배열을 `interval` 마다 한 칸씩 진행한다.
 * - `playOnce: true` 면 마지막 인덱스에서 멈추고 `onCompleteAction` 을 한 번 호출한다.
 *   `false` 면 `0` 으로 돌아와 무한 순환한다.
 * - `letterSlide: true` 면 각 글자를 한 글자씩 `delayPerChar` 만큼 스태거 애니메이션 한다.
 *   문자열이 아닌 ReactElement 가 들어오면 한 덩어리로 묶어 단일 모션을 적용한다.
 * - `direction` (`up`|`down`|`left`|`right`)과 `multiplier`(px) 가 모션의 진입 방향과 거리를 결정한다.
 *   퇴장 모션은 자동으로 반대 방향으로 적용된다.
 * - `ResizeObserver` 로 현재 텍스트의 높이를 측정해 컨테이너 높이가 모션 중에도 자연스럽게 따라간다.
 *
 * @example
 * <TextMotion
 *   texts={["환영합니다", "Welcome"]}
 *   interval={2000}
 *   direction="up"
 *   multiplier={20}
 *   letterSlide
 * />
 */
export function TextMotion({
  texts,
  interval,
  letterSlide = false,
  className,
  motionClassName,
  direction,
  multiplier,
  delayPerChar = 0.05,
  playOnce = false,
  onCompleteAction,
  onChangeIndexAction,
}: Readonly<Props>) {
  const [index, setIndex] = useState<number>(0);
  const [height, setHeight] = useState<number | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const hasCompletedRef = useRef<boolean>(false);
  const currentText = texts[index];

  const reverseDirection = (dir: Direction): Direction => {
    switch (dir) {
      case 'up':
        return 'down';
      case 'down':
        return 'up';
      case 'left':
        return 'right';
      case 'right':
        return 'left';
    }
  };

  const letterVariants = {
    hidden: (i: number) => ({
      opacity: 0,
      ...getOffset(direction, multiplier),
      transition: { delay: i * delayPerChar },
    }),
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      y: 0,
      transition: { delay: i * delayPerChar },
    }),
    exit: (i: number) => ({
      opacity: 0,
      ...getOffset(reverseDirection(direction), multiplier),
      transition: { delay: i * (delayPerChar * 0.6) },
    }),
  };

  useEffect(() => {
    if (playOnce && hasCompletedRef.current) return;

    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;

        if (next >= texts.length) {
          if (playOnce) {
            clearInterval(timer);
            hasCompletedRef.current = true;
            onCompleteAction?.();
            return prev; // 마지막 index로 멈춤
          }
          return 0;
        }

        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [texts, interval, playOnce, onCompleteAction]);

  useEffect(() => {
    if (textRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === textRef.current) {
            setHeight(entry.contentRect.height);
          }
        }
      });

      resizeObserver.observe(textRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [index]);

  useEffect(() => onChangeIndexAction?.(index), [index, onChangeIndexAction]);

  return (
    <div className={cn('relative w-fit', className)} style={{ height: height ?? 'auto' }}>
      <AnimatePresence mode="wait">
        {letterSlide ? (
          <motion.div
            key={index}
            ref={textRef}
            className={cn('absolute flex', motionClassName)}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            {typeof currentText === 'string' ? (
              currentText.split('').map((char, i) => (
                <motion.span key={`${char}-${i}`} custom={i} variants={letterVariants} className="inline-block w-max">
                  {char}
                </motion.span>
              ))
            ) : (
              <motion.span custom={0} variants={letterVariants} className="inline-block w-max">
                {currentText}
              </motion.span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={index}
            ref={textRef}
            initial={{ ...getOffset(direction, multiplier), opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{ ...getOffset(reverseDirection(direction), multiplier), opacity: 0 }}
            transition={{ duration: 0.3 }}
            layout
            className={cn('absolute w-max', motionClassName)}
          >
            {currentText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
