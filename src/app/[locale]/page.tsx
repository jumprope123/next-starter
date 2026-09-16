import { getServerAppTranslation } from '@/i18n/get-server-app-translation';
import { Link } from '@/i18n/navigation';
import { TemplatePlayground } from './_components/template-playground';

/**
 * 보일러플레이트 기본 랜딩 페이지.
 *
 * - 서버 컴포넌트에서 `getServerAppTranslation` 으로 번역을 받는 패턴 시연.
 * - locale 인식 `<Link>` 로 언어 전환을 시연한다.
 * - 클라이언트 측 React Query / Zustand / react-hook-form 는 `<TemplatePlayground />` 에 모아 두었다.
 *
 * 새 프로젝트 시작 시 이 파일은 그대로 교체해도 된다.
 */
export default async function LocalizedHomePage() {
  const t = await getServerAppTranslation();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-12">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{t('0001', { fallback: 'Next 단일 템플릿' })}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t('0002', { fallback: 'react-user-web 설정을 옮겨온 시작 템플릿입니다.' })}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t('0003', { fallback: '언어 전환 테스트' })}</h2>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <Link href="/" locale="ko" className="text-blue-600 underline">
            한국어
          </Link>
          <Link href="/" locale="en" className="text-blue-600 underline">
            English
          </Link>
        </div>
      </section>

      <TemplatePlayground />
    </main>
  );
}
