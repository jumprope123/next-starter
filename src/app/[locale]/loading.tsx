/**
 * 라우트 단위 Suspense 폴백.
 *
 * 페이지의 서버 컴포넌트가 데이터/RSC 를 기다리는 동안 React 가 자동으로 이 화면을 렌더한다.
 * 새 프로젝트에서는 디자인 시스템에 맞는 스켈레톤 / 스피너로 자유롭게 교체한다.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen-enhanced w-full items-center justify-center">
      <div
        className="size-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-700"
        aria-label="loading"
      />
    </div>
  );
}
