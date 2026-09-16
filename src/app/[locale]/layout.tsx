import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import localFont from 'next/font/local';
// `notFound` 는 next-intl 이 감싸지 않는 Next 내장 API 라 예외적으로 직접 import 한다.
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import '@/styles/globals.css';
import { getCookieAction } from '@/actions';
import { MobileDetector, Polyfill, PressFeedback } from '@/components';
import { CookieName } from '@/constants';
import { BackButtonHandler } from '@/core';
import { getAppMessages, type Locale } from '@/i18n/messages';
import { routing } from '@/i18n/routing';
import { AppShellProviders } from '@/providers';
import { SettingsHydrator } from '@/stores';
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
 *  6. `<SettingsHydrator />` — 영속 store 를 첫 페인트 이후에 복원 (hydration mismatch 방지).
 *  7. `#next-app-portal` — `<Portal />` 컴포넌트의 마운트 포인트.
 */
export default async function LocaleLayout({ children, params }: Readonly<LayoutProps<'/[locale]'>>) {
  const { locale: rawLocale } = await params;

  if (!hasLocale(routing.locales, rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  // 웹뷰 safe-area 게이트 플래그. 미들웨어(proxy.ts)가 `?safearea` 파라미터를 이 쿠키로 전환한다.
  // 켜져 있을 때만 <html> 에 `.app-safe-area` 를 부여해 안전영역 보정을 활성화 (styles/safe-area.css).
  const safeAreaEnabled = Boolean(await getCookieAction(CookieName.SAFE_AREA));

  return (
    <html lang={locale} className={cn(safeAreaEnabled && 'app-safe-area')}>
      <body
        className={cn(
          pretendard.variable,
          'touch-pan-y bg-background font-pretendard break-keep text-foreground antialiased select-none'
        )}
      >
        <Polyfill />

        <NextIntlClientProvider locale={locale} messages={getAppMessages(locale)}>
          <AppShellProviders>
            {/*
              id="app-page-shell": safe-area 게이트가 상/하단 inset 패딩을 주는 페이지 셸
              (styles/safe-area.css). 폭을 제한하는 모바일 셸(예: mx-auto max-w-md)을 쓰려면 이 div 에 준다.
            */}
            <div id="app-page-shell">
              <Suspense>{children}</Suspense>
            </div>

            <MobileDetector />
            {/* localStorage / sessionStorage 영속 store 복원 — hydration mismatch 를 피하려고
                첫 페인트 이후에 수행한다 (stores/settings/settings-store.ts 주석 참조). */}
            <SettingsHydrator />

            {/* For Portal Component */}
            <div id="next-app-portal" />

            {/* 브라우저/하드웨어 back 을 back-stack 에 연결 — 뒤로가기로 모달·바텀시트 닫기. */}
            <BackButtonHandler />
            {/* 터치/클릭한 요소를 살짝 안으로 눌러 넣는 모바일 시스템 앱 스타일 눌림 피드백.
                네이티브 탭 하이라이트(-webkit-tap-highlight-color)를 지운 자리를 메운다. */}
            <PressFeedback />
            {/* iPadOS 트랙패드 스타일 커스텀 포인터(`<CustomPointer />`)는 마운트하지 않는다 —
                기본 커서를 바꾸는 연출이 어색하다는 판단. 컴포넌트 / 상수 / CSS 는
                `@/components/custom-pointer` 와 `styles/custom-pointer.css` 에 그대로 남아 있으니,
                되살리려면 여기서 다시 마운트하면 된다. */}
          </AppShellProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
