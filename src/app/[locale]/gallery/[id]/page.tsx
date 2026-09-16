import { Suspense, ViewTransition } from 'react';

import { PageTransition } from '@/components';
import { getFrame, getFrameMeta } from '@/core';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';

/**
 * View Transition 데모 — 상세 페이지 (새 프로젝트에서는 `gallery/` 통째로 삭제).
 *
 * 세 가지 패턴이 한 화면에서 겹치지 않고 공존한다.
 *  1. 방향성 슬라이드 — `<PageTransition>` (네비게이션 시점)
 *  2. 공유 요소 morph — 히어로 판 / 제목 (같은 네비게이션 시점, 이름이 붙어 페이지 위에 뜬다)
 *  3. Suspense reveal — 부가 정보 (데이터가 늦게 도착하는 **별개의** transition)
 *
 * 2 와 3 이 충돌하지 않는 이유: 히어로는 Suspense 경계 **바깥**에서 즉시 렌더된다.
 * 페이지 전체가 fallback 뒤에 있으면 네비게이션이 커밋되는 순간 짝지을 상대가 DOM 에 없어
 * morph 가 성립하지 않는다. 그래서 `loading.tsx`(세그먼트 전체 경계) 대신 안쪽 `<Suspense>` 를 쓴다.
 */
export default async function GalleryDetailPage({ params }: Readonly<PageProps<'/[locale]/gallery/[id]'>>) {
  const { id } = await params;
  const frame = getFrame(id);

  if (!frame) notFound();

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-12">
        <Link href="/" transitionTypes={['nav-back']} className="text-sm text-blue-600 underline">
          ← 갤러리로
        </Link>

        {/* 공유 요소 — 그리드의 같은 name 과 짝지어 morph 한다. Suspense 바깥이어야 한다. */}
        <ViewTransition name={`frame-${frame.id}`} share="morph" default="none">
          <div className="aspect-[3/2] w-full rounded-2xl" style={{ backgroundImage: frame.gradient }} />
        </ViewTransition>

        <div>
          <ViewTransition name={`frame-title-${frame.id}`} share="text-morph" default="none">
            <h1 className="text-2xl font-bold">{frame.title}</h1>
          </ViewTransition>
          <p className="mt-1 text-sm text-zinc-500">{frame.author}</p>
        </div>

        {/*
          Suspense reveal — 스켈레톤이 아래로 빠지고 콘텐츠가 위에서 올라온다.
          타입 맵이 아니라 **문자열 prop** 을 쓴다: Suspense 해제는 transition type 을 싣지 않는
          별개의 transition 이라 타입 키는 매칭되지 않는다.
        */}
        <Suspense
          fallback={
            <ViewTransition exit="slide-down">
              <FrameMetaSkeleton />
            </ViewTransition>
          }
        >
          <ViewTransition enter="slide-up" default="none">
            <FrameMeta id={frame.id} />
          </ViewTransition>
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function FrameMeta({ id }: Readonly<{ id: string }>) {
  const meta = await getFrameMeta(id);
  if (!meta) return null;

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
      <div>
        <dt className="text-zinc-500">촬영</dt>
        <dd className="mt-1 font-medium text-zinc-800">{meta.captured}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">EXIF</dt>
        <dd className="mt-1 font-medium text-zinc-800">{meta.exif}</dd>
      </div>
    </dl>
  );
}

function FrameMetaSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="h-10 animate-pulse rounded bg-zinc-100" />
      <div className="h-10 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}
