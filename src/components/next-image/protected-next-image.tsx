import { ComponentProps, ReactNode } from 'react';
import { cn } from '@/utils';
import { OriginNextImage } from '@/components';

/**
 * `OriginNextImage` 를 감싸 우클릭/드래그/길게 누르기 저장을 차단하는 변형.
 *
 * 적용되는 보호 처리
 *  - `pointer-events-none` : 클릭/드래그를 비활성화 (이미지 위 인터랙션이 필요하면 부모에 위임).
 *  - `select-none` : 텍스트 선택 핸들러로 캡처되는 것을 방지.
 *  - `[-webkit-touch-callout: none]` : iOS Safari 의 길게 누르기 미리보기/저장 메뉴 차단.
 *  - `draggable={false}` : 데스크톱 드래그-앤-드롭 저장 차단.
 *
 * 완전한 DRM 은 아니며, 어디까지나 일반 사용자가 우발적으로 이미지를 저장/복사하는 것을
 * 어렵게 만드는 수준의 방어이다. `NextImage.Protected` 로도 노출된다.
 */
export function ProtectedNextImage({
  className,
  ...props
}: Readonly<ComponentProps<typeof OriginNextImage>>): ReactNode {
  return (
    <OriginNextImage
      {...props}
      className={cn(className, '[-webkit-touch-callout: none] pointer-events-none select-none')}
      draggable={false}
    />
  );
}
