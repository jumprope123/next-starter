'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@/utils';

type UseCopyToClipboardReturn = {
  /** 가장 최근에 시도한 텍스트와 성공 여부 (`null` 이면 아직 시도 전). */
  copied: { text: string; ok: boolean } | null;
  /** 복사를 시도하고 성공/실패를 boolean 으로 반환한다. */
  copy: (text: string) => Promise<boolean>;
  /** 복사 직후 일시적으로 `true` 가 되었다가 자동으로 `false` 로 돌아오는 상태 (UI 피드백용). */
  isCopied: boolean;
};

/**
 * 클립보드 복사를 React 흐름에 맞춰 다루는 훅.
 *
 * - 내부적으로 `copyToClipboard` 유틸을 호출하므로, HTTPS/localhost 가 아닌 환경에서도 폴백을 거친다.
 * - 복사에 성공하면 `isCopied` 가 `feedbackDuration` ms 동안 `true` 로 유지되어 "복사됨" 같은
 *   토스트/배지 UI 를 깔끔하게 그릴 수 있다.
 *
 * @example
 * const { copy, isCopied } = useCopyToClipboard();
 * <button onClick={() => copy(url)}>{isCopied ? '복사됨' : '복사'}</button>
 */
export function useCopyToClipboard(feedbackDuration: number = 1500): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState<UseCopyToClipboardReturn['copied']>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const copy = useCallback(
    async (text: string) => {
      const ok = await copyToClipboard(text);
      setCopied({ text, ok });
      if (ok) {
        setIsCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setIsCopied(false), feedbackDuration);
      }
      return ok;
    },
    [feedbackDuration]
  );

  return { copied, copy, isCopied };
}
