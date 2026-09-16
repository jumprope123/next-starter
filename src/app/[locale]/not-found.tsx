import { getServerAppTranslation } from '@/i18n/get-server-app-translation';
import { Link } from '@/i18n/navigation';
import { ROUTE_PATHS } from '@/constants';

/**
 * 404 폴백 — 매칭되는 라우트가 없을 때 Next.js 가 이 페이지를 렌더한다.
 *
 * `notFound()` 를 명시적으로 호출하면(예: 데이터 없음) 그 페이지의 `not-found.tsx` 가 우선이며,
 * 그 외에는 가장 가까운 `not-found.tsx` 가 폴백이 된다.
 *
 * 새 프로젝트에서는 브랜드/디자인 시스템에 맞춰 자유롭게 교체한다.
 */
export default async function NotFound() {
  const t = await getServerAppTranslation();

  return (
    <main className="mx-auto flex min-h-screen-enhanced w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-5 py-12 text-center">
      <p className="text-sm font-medium text-zinc-500">404</p>
      <h1 className="text-2xl font-bold">{t('0005', { fallback: '페이지를 찾을 수 없어요' })}</h1>
      <p className="text-sm text-zinc-600">
        {t('0006', { fallback: '주소가 잘못되었거나, 더 이상 존재하지 않는 페이지입니다.' })}
      </p>
      <Link
        href={ROUTE_PATHS.HOME}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        {t('0007', { fallback: '홈으로 돌아가기' })}
      </Link>
    </main>
  );
}
