import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import '@/styles/globals.css';
import { MobileDetector, Polyfill } from '@/components';
import { getAppMessages, type Locale } from '@/i18n/messages';
import { routing } from '@/i18n/routing';
import { AppShellProviders } from '@/providers';
import { cn, staticMetadata } from '@/utils';

export const metadata: Metadata = staticMetadata({
  title: 'Next App Boilerplate',
  description: 'Next.js boilerplate with i18n, React Query, Zustand, Tailwind CSS',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

const pretendard = localFont({
  src: '../../../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  preload: false,
});

/**
 * 모든 페이지를 감싸는 단일 루트 레이아웃 — `app/[locale]/layout.tsx` 가 표준이다.
 *
 * `localePrefix: 'as-needed'` 정책상 기본 로케일(`ko`)도 이 레이아웃을 거치므로,
 * 별도의 `app/layout.tsx` 는 두지 않는다. 마운트 순서는 다음과 같다.
 *  1. `<Polyfill />` — core-js 폴리필을 가장 먼저 주입.
 *  2. `<NextIntlClientProvider>` — 클라이언트 컴포넌트가 `useTranslations` / `useLocale` 등을 쓸 수 있게 한다.
 *  3. `<AppShellProviders>` — react-query / nuqs / react-hot-toast 를 한 번에 켠다.
 *  4. `<Suspense>{children}` — 페이지 트리.
 *  5. `<MobileDetector />` — User-Agent 분석 결과를 zustand 에 기록 (`isReady` 가 `true` 가 됨).
 *  6. `#next-app-portal` — `<Portal />` 컴포넌트의 마운트 포인트.
 */
export default async function LocaleLayout({ children, params }: Readonly<LayoutProps<'/[locale]'>>) {
  const { locale: rawLocale } = await params;

  if (!hasLocale(routing.locales, rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body
        className={cn(
          pretendard.variable,
          'touch-pan-y bg-background font-pretendard break-keep text-foreground antialiased select-none'
        )}
      >
        <Polyfill />

        <NextIntlClientProvider locale={locale} messages={getAppMessages(locale)}>
          <AppShellProviders>
            <Suspense>{children}</Suspense>

            <MobileDetector />

            {/* For Portal Component */}
            <div id="next-app-portal" />
          </AppShellProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
