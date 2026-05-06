/**
 * 텍스트를 클립보드에 복사한다.
 *
 * - `navigator.clipboard.writeText` 가 지원되면 우선 사용한다 (HTTPS / localhost 환경 필요).
 * - 지원되지 않으면 임시 `<textarea>` + `document.execCommand('copy')` 로 폴백한다.
 * - 두 방법 모두 실패하면 `false` 를 반환한다 — 호출 측이 토스트 등으로 fallback UI 를 띄우면 된다.
 *
 * SSR / 비브라우저 환경에서는 항상 `false` 를 반환한다.
 *
 * @example
 * const ok = await copyToClipboard('https://...');
 * if (ok) toast.success('복사 완료');
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* execCommand 폴백으로 진행 */
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};
