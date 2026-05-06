/**
 * 임의의 `Blob` / `File` / 문자열을 클라이언트에서 다운로드시킨다.
 *
 * 동작 요약
 * - `Blob` 또는 `File` 을 직접 받거나, 문자열 + MIME 으로 받아 임시 `Blob` 을 생성한다.
 * - 임시 `<a>` 를 만들어 `href` 에 `URL.createObjectURL` 결과를 넣고, 즉시 클릭한다.
 * - 메모리 누수 방지를 위해 다음 매크로태스크에서 `revokeObjectURL` 을 호출한다.
 *
 * SSR / 비브라우저 환경에서는 no-op 이다.
 *
 * @example
 * downloadFile({ blob, filename: 'export.csv' });
 * downloadFile({ content: 'a,b\n1,2', filename: 'sample.csv', mime: 'text/csv' });
 */
export const downloadFile = ({
  blob,
  content,
  mime = 'application/octet-stream',
  filename,
}: {
  blob?: Blob | File;
  content?: string;
  mime?: string;
  filename: string;
}): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const finalBlob = blob ?? (content !== undefined ? new Blob([content], { type: mime }) : null);
  if (!finalBlob) return;

  const url = URL.createObjectURL(finalBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
