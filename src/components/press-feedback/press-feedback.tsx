'use client';

import { useEffect } from 'react';

import { CUSTOM_POINTER_ACTIVE_CLASS } from '../custom-pointer';
import {
  PRESS_FEEDBACK_DEEP_SCALE,
  PRESS_FEEDBACK_DEEP_SCALE_ATTRIBUTE_SELECTOR,
  PRESS_FEEDBACK_EMPTY_SHADOW,
  PRESS_FEEDBACK_IGNORE_ATTRIBUTE_SELECTOR,
  PRESS_FEEDBACK_IGNORE_SELECTOR,
  PRESS_FEEDBACK_INSET,
  PRESS_FEEDBACK_MAX_SCALE,
  PRESS_FEEDBACK_MIN_PRESS_MS,
  PRESS_FEEDBACK_MIN_SCALE,
  PRESS_FEEDBACK_MOVE_TOLERANCE,
  PRESS_FEEDBACK_PASSTHROUGH_ATTRIBUTE_SELECTOR,
  PRESS_FEEDBACK_RELEASE_MS,
  PRESS_FEEDBACK_SCALE_VARIABLE,
  PRESS_FEEDBACK_SELECTOR,
  PRESS_FEEDBACK_SHADOW_VARIABLE,
  PRESS_FEEDBACK_SQUARE_RADIUS,
  PRESS_FEEDBACK_STATE_ATTRIBUTE,
  PRESS_FEEDBACK_STATE_OFF,
  PRESS_FEEDBACK_STATE_ON,
  PRESS_FEEDBACK_TINT_VARIABLE,
  PRESS_FEEDBACK_WATCHDOG_MS,
} from './press-feedback.constants';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * 커서 하이라이트(`CustomPointer`)가 이 눌림을 이미 강조하고 있는지.
 *
 * 하이라이트는 마우스 커서 환경(`hover: hover` + `pointer: fine`)에서만 활성화되고 터치에서는
 * 즉시 숨겨지므로, 활성 클래스만이 아니라 이번 입력이 마우스인지도 함께 본다 —
 * 마우스와 터치를 겸하는 기기에서 손가락으로 누를 땐 색상 강조가 그대로 남아야 한다.
 */
function isCursorHighlighted(event: PointerEvent): boolean {
  return event.pointerType === 'mouse' && document.documentElement.classList.contains(CUSTOM_POINTER_ACTIVE_CLASS);
}

/**
 * 눌림 대상을 찾는다 — 중첩된 경우 가장 안쪽 요소가 잡힌다.
 * 단 `data-press-passthrough` 가 걸린 후보(투명 오버레이 등)는 건너뛰고 상위 대상을 계속 찾는다.
 */
function findPressTarget(node: EventTarget | null): HTMLElement | null {
  let element = node instanceof Element ? node : null;

  while (element) {
    const candidate = element.closest<HTMLElement>(PRESS_FEEDBACK_SELECTOR);
    if (!candidate) return null;
    if (candidate.matches(PRESS_FEEDBACK_IGNORE_SELECTOR)) return null;
    // 자기 자신이든 조상이든 옵트아웃이 걸려 있으면 제외
    if (candidate.closest(PRESS_FEEDBACK_IGNORE_ATTRIBUTE_SELECTOR)) return null;
    if (!candidate.matches(PRESS_FEEDBACK_PASSTHROUGH_ATTRIBUTE_SELECTOR)) return candidate;
    element = candidate.parentElement;
  }

  return null;
}

/**
 * 요소 크기에 맞춘 축소 배율. 각 변이 대략 PRESS_FEEDBACK_INSET 만큼 들어가 보이도록 환산하고
 * 상·하한으로 자른다 — 큰 카드는 은은하게, 작은 버튼은 또렷하게 눌린다.
 * 인라인 요소(문단 안의 링크 등)는 변환이 적용되지 않으므로 축소를 포기하고 색상 강조만 남긴다.
 * `data-press-deep` 옵트인은 크기와 무관하게 더 깊은 고정 배율을 쓴다.
 */
function resolvePressScale(target: HTMLElement, rect: DOMRect): number {
  if (window.getComputedStyle(target).display === 'inline') return 1;
  if (target.closest(PRESS_FEEDBACK_DEEP_SCALE_ATTRIBUTE_SELECTOR)) return PRESS_FEEDBACK_DEEP_SCALE;
  const longest = Math.max(rect.width, rect.height);
  if (longest <= 0) return 1;
  return clamp(1 - (PRESS_FEEDBACK_INSET * 2) / longest, PRESS_FEEDBACK_MIN_SCALE, PRESS_FEEDBACK_MAX_SCALE);
}

/** 요소 자신이 radius 를 가지고 있는지. `'50%'` 같은 % 값도 0 보다 크므로 그대로 걸린다 */
function hasOwnRadius(style: CSSStyleDeclaration): boolean {
  return (
    Number.parseFloat(style.borderTopLeftRadius) > 0 ||
    Number.parseFloat(style.borderTopRightRadius) > 0 ||
    Number.parseFloat(style.borderBottomRightRadius) > 0 ||
    Number.parseFloat(style.borderBottomLeftRadius) > 0
  );
}

/**
 * 눌린 동안 얹을 radius(px). 각진 대상에만 값이 나오고, radius 를 이미 가진 요소는 0 —
 * 디자이너가 정한 모서리 모양을 눌림 연출이 덮어쓰지 않는다.
 * 짧은 변의 절반으로 잘라 얇은 요소가 pill 이상으로 둥글어지는 것도 막는다.
 */
function resolvePressRadius(target: HTMLElement, rect: DOMRect): number {
  if (hasOwnRadius(window.getComputedStyle(target))) return 0;
  return Math.min(PRESS_FEEDBACK_SQUARE_RADIUS, Math.min(rect.width, rect.height) / 2);
}

/**
 * 모바일 시스템 앱 스타일 눌림(press) 피드백.
 *
 * `body` 에 `-webkit-tap-highlight-color: transparent`(globals.css)를 걸어 네이티브 탭
 * 하이라이트를 지워둔 상태라, 웹뷰에서 무엇을 눌렀는지 알려주는 피드백이 없었다.
 *
 * - 터치/클릭 시작: 대상 요소가 살짝 안으로 들어가고(scale) 색상 강조가 얹힌다
 *   (각진 대상은 강조 톤의 모서리가 딱딱해 보이지 않게 눌린 동안만 살짝 둥글려 준다)
 * - 누른 채 대상 밖으로 벗어나면 강조 해제, 다시 들어오면 복귀 (네이티브와 동일한 동작)
 * - 스크롤 · 스와이프 제스처 · pointercancel · 컨텍스트 메뉴 · 창 이탈: 즉시 해제
 * - 터치/클릭 완료: 해제 (톡 치고 뗀 경우엔 최소 노출 시간을 채운 뒤)
 *
 * 커서 하이라이트(`CustomPointer`)와 달리 포인터가 아니라 **요소 자체**를 변형한다.
 * 모바일 전용 연출이지만 데스크탑 마우스에서도 동작하며, 다만 하이라이트가 이미 요소를
 * 감싸 강조하고 있는 마우스 입력에서는 색상 강조와 모서리 둥글리기를 빼고 축소만
 * 남긴다(`isCursorHighlighted`).
 * 스타일 정의는 `@/styles/press-feedback.css` 한 곳에 모여 있다.
 * 리렌더 없이 DOM 속성만 토글한다 — 포인터 이벤트마다 setState 하지 않는다.
 *
 * 주의: 눌린 요소는 `scale` 이 걸리는 동안 `position: fixed` 자손의 컨테이닝 블록이 된다.
 * 눌림 중 fixed 자식이 떠 있는 구조라면 `data-press-ignore` 로 제외한다.
 */
export function PressFeedback(): null {
  useEffect(() => {
    /** 현재 누르고 있는 대상 */
    let pressed: HTMLElement | null = null;
    /** 해제 전환이 재생 중인 대상들 → 전환이 끝나면 속성을 뗀다 (다른 요소 연타 시 겹칠 수 있어 Map) */
    const releaseTimers = new Map<HTMLElement, number>();
    let watchdogTimer = 0;
    let pointerId: number | null = null;
    /** 포인터가 대상 영역 안에 있는지 — 벗어나면 강조를 끄되 추적은 유지한다 */
    let inside = false;
    /** 누르기 시작한 좌표 — 여기서 일정 거리 이상 움직이면 탭이 아니라 제스처로 본다 */
    let startX = 0;
    let startY = 0;
    /** 누르기 시작한 시각 — 최소 노출 시간을 채웠는지 판정한다 */
    let pressedAt = 0;

    /**
     * 상태 속성과 커스텀 프로퍼티를 걷어내 요소를 원래대로 되돌린다.
     *
     * 되돌리는 순간 box-shadow 선언이 요소 자신의 것으로 바뀌는데, 그 요소가 `transition-all`
     * 을 갖고 있으면 이 되돌림까지 자기 전환 대상으로 잡아 box-shadow 전환이 하나 더 생긴다.
     * 양끝 값이 시각적으로 같아 눈에 띄진 않지만, 그 전환(150ms)이 끝나기 전에 다시 누르면
     * captureOwnShadow 가 보간 중간값을 '원래 그림자'로 착각해 담고, 누를 때마다 inset 이
     * 하나씩 쌓인다(10 회 연타 실측 1 → 5). 되돌림 동안만 전환을 꺼서 즉시 확정한다.
     */
    const cleanUp = (element: HTMLElement) => {
      element.style.setProperty('transition-property', 'none');
      element.removeAttribute(PRESS_FEEDBACK_STATE_ATTRIBUTE);
      element.style.removeProperty(PRESS_FEEDBACK_SCALE_VARIABLE);
      element.style.removeProperty(PRESS_FEEDBACK_SHADOW_VARIABLE);
      element.style.removeProperty(PRESS_FEEDBACK_TINT_VARIABLE);
      element.style.removeProperty('border-radius');
      // 리플로우를 강제해 전환이 꺼진 상태에서 되돌림을 확정한다.
      // 반드시 **메서드 호출**이어야 한다 — 결과를 쓰지 않는 프로퍼티 읽기
      // (`void getComputedStyle(el).boxShadow` 등)는 React Compiler(next.config.ts 의
      // `reactCompiler: true`)가 걷어내 `getComputedStyle(el)` 만 남기고, 그것만으로는
      // 반환 객체가 지연 평가라 재계산이 일어나지 않아 억제가 통째로 무력화된다.
      element.getBoundingClientRect();
      element.style.removeProperty('transition-property');
      // 우리가 넣은 커스텀 프로퍼티만 있던 요소에 빈 style 속성이 남지 않게
      if (element.getAttribute('style') === '') element.removeAttribute('style');
    };

    /**
     * 요소 본래의 box-shadow 를 보관해 강조 그림자 뒤에 이어 붙일 수 있게 한다.
     * 계산값은 상태 속성이 붙어 있지 않을 때만 신뢰할 수 있다 — 붙어 있는 동안의 계산값에는
     * 우리가 얹은 강조 그림자가 이미 섞여 있어, 그대로 읽으면 누를 때마다 중첩된다.
     */
    const captureOwnShadow = (element: HTMLElement) => {
      // 해제 전환 중 다시 누른 경우 — 직전에 보관해 둔 값을 그대로 쓴다
      if (element.style.getPropertyValue(PRESS_FEEDBACK_SHADOW_VARIABLE)) return;
      // 보관값 없이 상태 속성만 남아 있다면 계산값을 믿을 수 없으니 읽지 않는다
      if (element.hasAttribute(PRESS_FEEDBACK_STATE_ATTRIBUTE)) {
        element.style.setProperty(PRESS_FEEDBACK_SHADOW_VARIABLE, PRESS_FEEDBACK_EMPTY_SHADOW);
        return;
      }
      const own = window.getComputedStyle(element).boxShadow;
      element.style.setProperty(
        PRESS_FEEDBACK_SHADOW_VARIABLE,
        own && own !== 'none' ? own : PRESS_FEEDBACK_EMPTY_SHADOW
      );
    };

    /** 지연 해제·해제 전환 대기열에서 빼낸다. finalize=true 면 속성까지 제거 */
    const stopReleasing = (element: HTMLElement, finalize: boolean) => {
      const timer = releaseTimers.get(element);
      if (timer === undefined) return;
      window.clearTimeout(timer);
      releaseTimers.delete(element);
      if (finalize) cleanUp(element);
    };

    /** 해제 전환 시작 → 전환이 끝나면 속성을 뗀다 */
    const startReleaseTransition = (element: HTMLElement) => {
      element.setAttribute(PRESS_FEEDBACK_STATE_ATTRIBUTE, PRESS_FEEDBACK_STATE_OFF);
      releaseTimers.set(
        element,
        window.setTimeout(() => stopReleasing(element, true), PRESS_FEEDBACK_RELEASE_MS)
      );
    };

    /**
     * @param immediate 최소 노출 보장을 건너뛰고 곧바로 해제 전환에 들어간다.
     *   탭이 성립하지 않은 취소 경로(스크롤 · 스와이프 · pointercancel · 창 이탈 등)에 쓴다 —
     *   네이티브는 제스처로 판정되는 즉시 강조를 거둔다. 여기서 최소 노출을 채우겠다고 더
     *   보여주면 "눌린 게 먹혔다"는 잘못된 신호가 된다. 최소 노출은 탭이 실제로 완료된
     *   pointerup 에서만 의미가 있다.
     */
    const release = (immediate = false) => {
      window.clearInterval(watchdogTimer);
      watchdogTimer = 0;
      pointerId = null;
      inside = false;

      const element = pressed;
      pressed = null;
      if (!element) return;

      stopReleasing(element, false);

      // 톡 치고 뗀 경우 — 눌리는 전환이 채 보이기도 전에 되돌아가지 않도록 남은 시간만큼 유지한다.
      // 대기 중 같은 요소를 다시 누르면 stopReleasing 이 이 타이머를 걷어내고 'on' 이 이어진다.
      const remaining = immediate ? 0 : PRESS_FEEDBACK_MIN_PRESS_MS - (performance.now() - pressedAt);
      if (remaining <= 0) {
        startReleaseTransition(element);
        return;
      }

      releaseTimers.set(
        element,
        window.setTimeout(() => {
          releaseTimers.delete(element);
          startReleaseTransition(element);
        }, remaining)
      );
    };

    const setInside = (next: boolean) => {
      if (!pressed || inside === next) return;
      inside = next;
      pressed.setAttribute(PRESS_FEEDBACK_STATE_ATTRIBUTE, next ? PRESS_FEEDBACK_STATE_ON : PRESS_FEEDBACK_STATE_OFF);
    };

    const handlePointerDown = (event: PointerEvent) => {
      // 멀티터치·연타 — 직전 대상을 먼저 해제하고 새 대상으로 넘어간다.
      // 여기까지 남아 있는 press 는 pointerup 을 못 받고 굳은 것이므로 최소 노출 없이 즉시 정리
      release(true);
      // 마우스는 주 버튼만 (보조 버튼은 컨텍스트 메뉴 등)
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      const target = findPressTarget(event.target);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      // 화면을 거의 다 덮는 영역은 눌림 효과가 과해서 제외한다
      if (rect.height > window.innerHeight * 0.7 && rect.width > window.innerWidth * 0.9) return;

      // 방금 뗀 요소를 다시 눌렀다면 되돌아가던 전환을 취소하고 곧바로 이어받는다
      stopReleasing(target, false);

      pressed = target;
      pointerId = event.pointerId;
      inside = true;
      startX = event.clientX;
      startY = event.clientY;
      pressedAt = performance.now();
      // 계산값 읽기(captureOwnShadow)는 반드시 상태 속성을 붙이기 전에
      captureOwnShadow(target);
      target.style.setProperty(PRESS_FEEDBACK_SCALE_VARIABLE, `${resolvePressScale(target, rect)}`);
      // 커서 하이라이트가 이미 요소를 감싸 강조하고 있으면 색상 강조는 얹지 않는다 — 두 강조가
      // 겹치면 과하게 어두워진다. 축소는 그대로 남아 눌린 느낌은 유지된다.
      // (해제 전환 중 다시 누른 경우를 위해, 아닐 땐 직전에 고정해 둔 값을 반드시 걷어낸다)
      const cursorHighlighted = isCursorHighlighted(event);
      if (cursorHighlighted) {
        target.style.setProperty(PRESS_FEEDBACK_TINT_VARIABLE, '0');
      } else {
        target.style.removeProperty(PRESS_FEEDBACK_TINT_VARIABLE);
      }
      // 모서리 둥글리기는 강조 톤의 각을 죽이려는 것이라 톤이 없으면 할 이유가 없다 — 하이라이트가
      // 켜진 마우스 입력에서는 생략한다(그것만 재생되면 눌림과 무관한 모양 변화로 보인다).
      // 해제 전환 중 다시 누른 경우엔 직전에 얹어 둔 값이 계산값으로 잡혀 resolvePressRadius 가 0 을
      // 내므로, 이미 붙은 인라인 radius 를 그대로 이어 쓴다 — 눌린 채 각지게 되돌리지 않는다.
      const pressRadius = cursorHighlighted ? 0 : resolvePressRadius(target, rect);
      if (pressRadius > 0) target.style.borderRadius = `${pressRadius}px`;
      target.setAttribute(PRESS_FEEDBACK_STATE_ATTRIBUTE, PRESS_FEEDBACK_STATE_ON);

      // 클릭으로 대상이 사라지면(다이얼로그 닫기 버튼 등) pointerup 이 창까지 올라오지 않는다
      watchdogTimer = window.setInterval(() => {
        if (!pressed?.isConnected) release(true);
      }, PRESS_FEEDBACK_WATCHDOG_MS);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pressed || event.pointerId !== pointerId) return;

      // 배너 캐러셀·바텀시트처럼 대상이 손가락을 따라 움직이는 제스처는 scroll 이벤트도
      // rect 이탈도 없으므로, 이동 거리로 탭이 아님을 판정해 눌림을 거둔다
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > PRESS_FEEDBACK_MOVE_TOLERANCE) {
        release(true);
        return;
      }

      const rect = pressed.getBoundingClientRect();
      setInside(
        event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
      );
    };

    /** 탭 완료 — 최소 노출을 채운 뒤 해제한다 */
    const handlePointerUp = (event: PointerEvent) => {
      if (pointerId !== null && event.pointerId !== pointerId) return;
      release();
    };

    /** 브라우저가 제스처로 가져감(스크롤 시작 등) — 탭이 아니므로 즉시 해제 */
    const handlePointerCancel = (event: PointerEvent) => {
      if (pointerId !== null && event.pointerId !== pointerId) return;
      release(true);
    };

    // 스크롤이 시작되면 탭이 아니라 스크롤 제스처이므로 네이티브처럼 즉시 강조를 거둔다
    const handleRelease = () => release(true);

    // capture: stopPropagation 하는 위젯 안에서도 눌림/해제를 놓치지 않는다
    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true, passive: true });
    window.addEventListener('pointercancel', handlePointerCancel, { capture: true, passive: true });
    window.addEventListener('scroll', handleRelease, { capture: true, passive: true });
    window.addEventListener('contextmenu', handleRelease, true);
    window.addEventListener('dragstart', handleRelease, true);
    window.addEventListener('blur', handleRelease);
    document.addEventListener('visibilitychange', handleRelease);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      window.removeEventListener('scroll', handleRelease, true);
      window.removeEventListener('contextmenu', handleRelease, true);
      window.removeEventListener('dragstart', handleRelease, true);
      window.removeEventListener('blur', handleRelease);
      document.removeEventListener('visibilitychange', handleRelease);
      window.clearInterval(watchdogTimer);
      // 언마운트 시 눌린 채/되돌아가던 중 남은 속성까지 확실히 회수한다
      if (pressed) cleanUp(pressed);
      pressed = null;
      for (const element of [...releaseTimers.keys()]) stopReleasing(element, true);
    };
  }, []);

  return null;
}
