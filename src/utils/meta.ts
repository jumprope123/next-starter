import { Metadata } from 'next';

/**
 * Next.js App Router용 정적 `Metadata` 객체를 정규화해 반환한다.
 *
 * `title` / `description`을 문자열로 강제 변환하고, `keywords`를 항상 배열 형태로
 * 정렬하여 페이지 컴포넌트에서 일관된 형태로 사용할 수 있도록 한다.
 *
 * @param meta 페이지에서 정의한 메타데이터
 * @returns Next.js가 그대로 사용할 수 있는 `Metadata` 객체
 * @example
 * export const metadata = staticMetadata({
 *   title: 'Home',
 *   description: 'My homepage',
 *   keywords: 'next,react',
 * });
 */
export function staticMetadata(meta: Metadata): Metadata {
  return {
    ...meta,
    title: `${meta.title}`,
    description: `${meta.description}`,
    openGraph: {
      ...meta.openGraph,
      images: meta.openGraph?.images,
    },
    keywords: [...(typeof meta.keywords === 'string' ? [meta.keywords] : meta.keywords || [])],
  };
}

/**
 * 현재 페이지의 제목과 URL을 Web Share API로 공유한다.
 *
 * `navigator.share` 가 지원되고 `canShare()` 가 데이터를 허용할 때만 호출된다.
 * 사용자가 공유 시트를 취소하거나 권한 오류가 발생하면 콘솔로 에러를 출력한다.
 * 대부분의 모바일 브라우저에서만 동작하며, 데스크톱 브라우저에서는 보통 no-op 이다.
 *
 * @returns 공유가 시도된 후 resolve 되는 Promise
 */
export const shareCurrentPage = async () => {
  const data: ShareData = { title: document.title, url: window.location.href };
  if (!!navigator?.share && navigator?.canShare?.(data)) {
    try {
      await navigator.share(data);
    } catch (err) {
      console.error(err);
    }
  }
};
