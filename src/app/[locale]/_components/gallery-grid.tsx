import { ViewTransition } from 'react';

import { FRAMES } from '@/core';
import { Link } from '@/i18n/navigation';

/**
 * View Transition 데모 — 갤러리 그리드 (새 프로젝트에서는 삭제).
 *
 * 각 카드는 두 가지를 동시에 시연한다.
 *  - 그라디언트 판: `name={`frame-${id}`}` + `share="morph"` → 상세 페이지 히어로로 **모양이 이어진다**.
 *  - 제목: `share="text-morph"` → 텍스트는 래스터 확대 시 고스트가 생기므로 전용 레시피를 쓴다.
 *
 * `default="none"` 은 필수다. 없으면 이름이 붙은 모든 VT 가 **관계없는 모든 transition** 마다
 * 크로스페이드를 돌린다. 다만 `default="none"` 을 주면 `share` 도 함께 꺼지므로 `share` 를
 * **명시적으로** 남겨야 morph 가 살아 있다 (둘 중 하나만 하면 조용히 동작하지 않는다).
 *
 * `transitionTypes={['nav-forward']}` 가 없으면 페이지 슬라이드가 `default: 'none'` 으로 떨어져
 * 방향 전환이 재생되지 않는다 — 계층 이동이므로 반드시 붙인다.
 */
export function GalleryGrid() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">View Transitions</h2>
      <p className="mt-1 text-sm text-zinc-600">
        카드를 누르면 판과 제목이 상세 화면으로 이어지고(morph), 페이지는 왼쪽으로 밀립니다.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FRAMES.map((frame) => (
          <Link key={frame.id} href={`/gallery/${frame.id}`} transitionTypes={['nav-forward']} className="group block">
            <ViewTransition name={`frame-${frame.id}`} share="morph" default="none">
              <div className="aspect-[4/3] w-full rounded-xl" style={{ backgroundImage: frame.gradient }} />
            </ViewTransition>
            <ViewTransition name={`frame-title-${frame.id}`} share="text-morph" default="none">
              <p className="mt-2 text-sm font-medium text-zinc-800">{frame.title}</p>
            </ViewTransition>
          </Link>
        ))}
      </div>
    </section>
  );
}
