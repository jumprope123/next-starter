'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 주어진 셀렉터에 매칭되는 모든 요소에 "스크롤 진입 시 페이드 인 + 위로 슬라이드" 애니메이션을 적용한다.
 *
 * - GSAP + `ScrollTrigger` 기반이며, `ScrollTrigger` 는 모듈 로드 시 한 번만 등록된다.
 * - 시작 트리거는 `top 80%` (요소 상단이 뷰포트 80% 지점에 도달했을 때).
 * - 화면 밖으로 다시 나가면 `reverse` 동작으로 원상복귀한다.
 * - 셀렉터가 가리키는 요소가 변경되면 기존 ScrollTrigger 들을 모두 `kill()` 후 재생성한다.
 *
 * 클라이언트 전용. 셀렉터는 GSAP 의 `gsap.utils.toArray` 가 받는 형식을 그대로 사용한다.
 *
 * @param selector CSS 셀렉터 또는 매칭 대상 표현식
 */
export function useScrollFadeIn(selector: string) {
  useEffect(() => {
    const elements = gsap.utils.toArray(selector) as HTMLElement[];
    const triggers: ScrollTrigger[] = [];

    elements.forEach((el) => {
      const animation = gsap.fromTo(
        el,
        {
          autoAlpha: 0,
          y: 50,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      triggers.push(animation.scrollTrigger!);
    });

    return () => {
      triggers.forEach((trigger) => trigger.kill());
    };
  }, [selector]);
}
