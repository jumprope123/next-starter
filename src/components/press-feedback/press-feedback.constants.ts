/**
 * 모바일 시스템 앱 스타일 눌림(press) 피드백 상수.
 * 커서 하이라이트(`custom-pointer/pointer.constants.ts`)와는 별개 기능 — 이쪽은 커서가 아니라
 * **눌린 요소 자체**를 살짝 줄이고 톤을 얹는다. 데스크탑 마우스에서도 동작한다.
 */

/** 눌림 상태를 나타내는 DOM 속성. 값은 아래 두 가지 */
export const PRESS_FEEDBACK_STATE_ATTRIBUTE = 'data-pressed';

/** 누르고 있는 중 — 축소 + 색상 강조 */
export const PRESS_FEEDBACK_STATE_ON = 'on';

/**
 * 손을 뗀 직후 — 원래대로 돌아가는 전환이 재생되는 구간.
 * 속성을 곧바로 제거하면 transition 선언까지 함께 사라져 즉시 튕겨 돌아가므로,
 * 전환이 끝난 뒤(PRESS_FEEDBACK_RELEASE_MS)에 제거한다.
 */
export const PRESS_FEEDBACK_STATE_OFF = 'off';

/** JS 가 요소 크기에 맞춰 계산해 넣는 축소 배율 커스텀 프로퍼티 */
export const PRESS_FEEDBACK_SCALE_VARIABLE = '--press-scale';

/**
 * 색상 강조의 진행도(0 → 1) 커스텀 프로퍼티. 평소엔 `press-feedback.css` 가 상태 속성에 맞춰
 * 0 ↔ 1 로 보간하지만, 커서 하이라이트가 이미 요소를 강조하고 있는 마우스 입력에서는
 * PressFeedback 이 인라인으로 0 을 고정해 색상 강조만 빼고 축소는 그대로 남긴다.
 */
export const PRESS_FEEDBACK_TINT_VARIABLE = '--press-tint';

/**
 * 눌리기 직전 요소가 가지고 있던 box-shadow 를 담아두는 커스텀 프로퍼티.
 * 색상 강조를 inset box-shadow 로 얹으면 요소 본래의 그림자(`shadow-lg` 등)가 통째로 덮이므로,
 * 원본 값을 여기 보관했다가 강조 그림자 뒤에 다시 이어 붙인다.
 */
export const PRESS_FEEDBACK_SHADOW_VARIABLE = '--press-shadow';

/** 본래 그림자가 없을 때 `PRESS_FEEDBACK_SHADOW_VARIABLE` 에 넣는 투명 그림자 */
export const PRESS_FEEDBACK_EMPTY_SHADOW = '0 0 #0000';

/**
 * 눌렸을 때 각 변이 안쪽으로 들어가 보이는 목표 거리(px).
 * 축소 배율은 `1 - (inset * 2) / 긴 변` 으로 환산해 큰 카드는 살짝, 작은 버튼은 또렷하게 들어간다.
 */
export const PRESS_FEEDBACK_INSET = 5;

/** 축소 배율 하한 — 작은 버튼이 과하게 쪼그라들지 않게 */
export const PRESS_FEEDBACK_MIN_SCALE = 0.94;

/**
 * 각진 대상(네 모서리 radius 가 모두 0)에 눌림 동안만 얹는 radius(px).
 * 색상 강조는 inset box-shadow 라 요소의 radius 를 그대로 따라가는데, 직각 요소에서는
 * 톤이 모서리까지 칼같이 차 네이티브 하이라이트보다 딱딱해 보인다. 눌린 동안만 살짝
 * 둥글려 톤의 모서리를 부드럽게 한다 — 짧은 변의 절반을 넘지 않게 잘라 pill 이상으로는 가지 않는다.
 *
 * **radius 를 이미 가진 요소는 건드리지 않는다** — 디자이너가 정한 모양(모서리별 값·pill 등)을
 * 눌림 연출이 덮어써선 안 된다.
 *
 * 색상 강조가 빠지는 입력(커서 하이라이트가 켜진 마우스)에서는 이것도 함께 생략한다 —
 * 톤 없이 모서리만 둥글어지면 눌림이 아니라 모양 변화로 읽힌다.
 */
export const PRESS_FEEDBACK_SQUARE_RADIUS = 8;

/** 축소 배율 상한 — 큰 카드에서도 최소한의 눌림감은 남게 */
export const PRESS_FEEDBACK_MAX_SCALE = 0.985;

/**
 * 이 속성이 붙은 요소(또는 그 자손 대상)는 크기 기반 환산 대신
 * `PRESS_FEEDBACK_DEEP_SCALE` 을 그대로 쓴다 — 또렷하게 눌리는 것이 더 어울리는 곳용.
 * 하단 네비게이터 탭 셀 같은 곳이 이 옵트인을 쓴다.
 */
export const PRESS_FEEDBACK_DEEP_SCALE_ATTRIBUTE_SELECTOR = '[data-press-deep]';

/** `data-press-deep` 옵트인의 고정 축소 배율 */
export const PRESS_FEEDBACK_DEEP_SCALE = 0.9;

/**
 * 해제 상태(`off`)를 유지하는 시간(ms). 이 시간이 지나야 속성을 뗀다.
 * press-feedback.css 의 `[data-pressed='off']` transition(220ms)이 끝난 뒤에 떨어지도록
 * 약간의 여유를 둔다 — 경계에서 잘리면 마지막 몇 프레임이 튄다.
 */
export const PRESS_FEEDBACK_RELEASE_MS = 260;

/**
 * 눌림을 최소한 이만큼은 보여준다(ms).
 * 짧게 톡 치면 pointerdown → pointerup 이 수십 ms 안에 끝나 눌리는 전환이 시작되자마자
 * 되돌아간다 — 실측으로 16ms 탭은 톤이 31%(scale 0.982), 32ms 탭은 53% 까지만 올랐다.
 * 네이티브 하이라이트처럼 최소 노출을 보장해 빠른 탭에서도 같은 세기로 보이게 한다.
 *
 * **탭이 완료된 pointerup 에서만 적용된다.** 스크롤·스와이프·pointercancel 처럼 탭이
 * 무산된 취소 경로는 즉시 해제한다 — 자세한 이유는 `press-feedback.tsx` 의 `release()` 참고.
 */
export const PRESS_FEEDBACK_MIN_PRESS_MS = 90;

/**
 * 누르고 있는 동안 대상이 DOM 에 살아 있는지 확인하는 주기(ms).
 * 클릭으로 대상이 사라지면(다이얼로그 닫기 버튼 등) pointerup 이 창까지 올라오지 않아
 * 눌림 상태가 남을 수 있어 별도로 회수한다.
 */
export const PRESS_FEEDBACK_WATCHDOG_MS = 200;

/**
 * 탭이 아니라 제스처로 판정하는 이동 거리(px).
 * 배너 캐러셀 · 바텀시트 · PullToRefresh 처럼 transform 으로 움직이는 제스처는 `scroll`
 * 이벤트를 내지 않고 대상 요소가 손가락을 따라오므로 rect 이탈로도 잡히지 않는다 —
 * 이동 거리로 직접 끊어 네이티브처럼 스와이프 중엔 눌림이 남지 않게 한다.
 */
export const PRESS_FEEDBACK_MOVE_TOLERANCE = 10;

/**
 * 눌림 효과를 줄 대상. 커서 하이라이트와 목적이 달라 목록을 따로 관리한다
 * (텍스트 입력은 제외 — 캐럿이 들어가는 필드가 줄어들면 어색하다).
 * 여기에 안 걸리는 커스텀 클릭 영역은 `data-press-target` 으로 옵트인한다.
 */
export const PRESS_FEEDBACK_SELECTOR = [
  'a[href]',
  'button',
  'select',
  'summary',
  'label[for]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="file"]',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '.cursor-pointer',
  '[data-press-target]',
].join(', ');

/** 대상에 걸렸더라도 눌림 효과를 주지 않을 요소 */
export const PRESS_FEEDBACK_IGNORE_SELECTOR = [':disabled', '[aria-disabled="true"]'].join(', ');

/** 이 속성이 붙은 요소와 그 하위는 눌림 효과에서 제외한다 */
export const PRESS_FEEDBACK_IGNORE_ATTRIBUTE_SELECTOR = '[data-press-ignore]';

/**
 * 이 속성이 붙은 요소는 자신이 눌림 대상이 되지 않고 **상위 대상에게 넘긴다**.
 * 효과를 통째로 끄는 `data-press-ignore` 와 다르다 — 실제로 눌린 건 위에 덮인 이 요소지만
 * 사용자가 누른 것으로 인식하는 건 그 아래 요소인 경우에 쓴다 (투명 오버레이 등).
 */
export const PRESS_FEEDBACK_PASSTHROUGH_ATTRIBUTE_SELECTOR = '[data-press-passthrough]';

/*
 * 색상 강조만 빼려면 `data-press-no-tint` — 요소 자신 또는 조상에 붙이면 톤 없이 축소만 재생된다.
 * JS 는 관여하지 않고 CSS 가 `--press-tint` 를 0 으로 고정하며, 규칙은
 * `@/styles/press-feedback.css` 에 있다.
 */
