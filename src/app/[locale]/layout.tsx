import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import '@/styles/globals.css';
import { getCookieAction } from '@/actions';
import { CustomPointer, MobileDetector, Polyfill, PressFeedback } from '@/components';
import { CookieName } from '@/constants';
import { BackButtonHandler, PageViewTransition, PopstateViewTransitionNotifier } from '@/core';
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
              PageViewTransition: Link/useRouter (`@/i18n/navigation`) 가 주입한 transitionTypes
              (nav-forward · nav-back · nav-lateral · nav-fade) 에 따라 view-transitions.css 의
              `::view-transition-old(.nav-*)` 셀렉터로 iOS 스타일 push/pop 슬라이드를 실행한다.

              id="app-page-shell": popstate(브라우저 back/forward) 전환을 구동하는
              `@/core/view-transition` 의 PAGE_SHELL_ELEMENT_ID 와 짝 — 해당 모듈이 이 div 를 찾아
              view-transition-name 을 부여한다. page-shell 은 transition snapshot 단위라 화면 전체를
              덮어야 하며, 폭을 제한하는 모바일 셸(예: mx-auto max-w-md)을 쓰려면 이 div 에 준다.
            */}
            <PageViewTransition>
              <div id="app-page-shell">
                <Suspense>{children}</Suspense>
              </div>
            </PageViewTransition>

            <MobileDetector />

            {/* For Portal Component */}
            <div id="next-app-portal" />

            {/* 브라우저/하드웨어 back 을 back-stack 에 연결 — 뒤로가기로 모달·바텀시트 닫기. */}
            <BackButtonHandler />
            {/* 브라우저 back/forward(popstate) 의 View Transition 라우트 commit 보고용. */}
            <PopstateViewTransitionNotifier />
            {/* 터치/클릭한 요소를 살짝 안으로 눌러 넣는 모바일 시스템 앱 스타일 눌림 피드백.
                네이티브 탭 하이라이트(-webkit-tap-highlight-color)를 지운 자리를 메운다. */}
            <PressFeedback />
            {/* iPadOS 트랙패드 스타일 커스텀 포인터 — 마우스 전용(hover+fine), 터치/모바일에선 미표시. */}
            <CustomPointer />
          </AppShellProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
