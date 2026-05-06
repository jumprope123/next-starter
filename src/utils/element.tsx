import { cn } from '@/utils';

/**
 * 텍스트 안에서 검색어와 일치하는 부분을 `<span>`으로 감싸 강조 표시한다.
 *
 * 일치 비교는 대소문자를 구분하지 않으며(`'gi'` 플래그), 일치하지 않으면 입력 문자열을
 * 그대로 반환한다. 검색어가 빈 문자열이거나 일치 항목이 없을 때도 원본 문자열을 반환한다.
 *
 * 각 강조 `<span>`에는 `Math.random()` 기반의 랜덤 `key` 가 부여되므로, 매 렌더마다
 * 새로운 키가 생성되어 React가 노드를 재사용하지 못한다. 검색 결과 같은 짧은 수명의
 * UI에서는 충분하지만, 자주 리렌더되는 곳에서는 입력 문자열을 메모이제이션하는 것을 권장한다.
 *
 * @param text 원본 텍스트
 * @param query 강조할 검색어 (대소문자 무시)
 * @param options.className 강조 `<span>`에 적용할 CSS 클래스
 * @returns 강조된 React 노드 또는 원본 문자열
 * @example
 * getHighlightedText('Hello World', 'world', { className: 'text-red-500' });
 */
export const getHighlightedText = (text: string, query: string, options?: { className?: string }) => {
  const re = new RegExp(`(${query})`, 'gi');
  if (query !== '' && text.match(re)) {
    const parts = text.split(re);
    return (
      <>
        {parts.map((part) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={Math.random().toString(36).slice(2)} className={cn(options?.className)}>
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  }
  return text;
};
