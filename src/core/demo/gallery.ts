import { sleep } from '@/utils';

/**
 * View Transition 시연용 데모 데이터 — 새 프로젝트에서는 통째로 지운다.
 *
 * 실제 이미지 대신 CSS 그라디언트를 쓴다. 공유 요소 morph 는 `<img>` 가 아니라 **아무 요소에나**
 * 걸리므로, 바이너리 에셋이나 `next.config` 의 remote image 설정 없이도 패턴을 그대로 보여줄 수 있다.
 */
export type Frame = {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly gradient: string;
};

export const FRAMES: readonly Frame[] = [
  { id: 'aurora', title: 'Aurora', author: 'Yuna Seo', gradient: 'linear-gradient(135deg,#6366f1,#06b6d4)' },
  { id: 'ember', title: 'Ember', author: 'Jiho Park', gradient: 'linear-gradient(135deg,#f97316,#ef4444)' },
  { id: 'moss', title: 'Moss', author: 'Dain Lim', gradient: 'linear-gradient(135deg,#10b981,#84cc16)' },
  { id: 'dusk', title: 'Dusk', author: 'Suhyun Kang', gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
  { id: 'slate', title: 'Slate', author: 'Minjun Oh', gradient: 'linear-gradient(135deg,#475569,#94a3b8)' },
  { id: 'sand', title: 'Sand', author: 'Haeun Cho', gradient: 'linear-gradient(135deg,#eab308,#fb923c)' },
];

export function getFrame(id: string): Frame | undefined {
  return FRAMES.find((frame) => frame.id === id);
}

/**
 * 상세 페이지의 "느린" 부가 정보. Suspense reveal 을 눈에 보이게 하려고 일부러 지연시킨다.
 *
 * 공유 요소(히어로)는 이 경계 **바깥**에서 즉시 렌더된다 — 도착 페이지가 통째로 fallback 뒤에
 * 있으면 네비게이션 커밋 시점에 짝지을 상대가 없어서 morph 가 아예 성립하지 않는다.
 */
export async function getFrameMeta(id: string): Promise<{ exif: string; captured: string } | null> {
  await sleep(900);
  const frame = getFrame(id);
  if (!frame) return null;
  return { exif: 'f/1.8 · 1/250s · ISO 200', captured: `2026.0${(FRAMES.indexOf(frame) % 9) + 1}.14` };
}
