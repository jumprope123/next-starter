'use client';

import Image, { type ImageProps, StaticImageData } from 'next/image';
import {
  ComponentProps,
  CSSProperties,
  ReactNode,
  RefObject,
  SyntheticEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';
import type { Property } from 'csstype';
import { cn } from '@/utils';

type Props = Omit<ImageProps, 'width' | 'height' | 'src' | 'alt' | 'objectFit'> & {
  width?: Property.Width | number;
  height?: Property.Height | number;
  maxWidth?: Property.MaxWidth | number;
  maxHeight?: Property.MaxHeight | number;
  minWidth?: Property.MinWidth | number;
  minHeight?: Property.MinHeight | number;
  responsiveRatio?: Property.PaddingBottom;
  src?: ComponentProps<typeof Image>['src'];
  alt?: string;
  objectFit?: Property.ObjectFit;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  imageBoxClassName?: string;
  imageBoxStyle?: CSSProperties;
  imageStyle?: CSSProperties;
  onClick?: () => void;
  containerRef?: RefObject<HTMLDivElement | null> | null;
  fallbackAspectRatio?: 'square' | 'landscape';
  fallbackSrc?: ComponentProps<typeof Image>['src'] | null;
};

/**
 * `next/image` 를 감싸 컨테이너 + 박스 + 이미지 3 단 구조를 자동 구성하는 이미지 컴포넌트.
 *
 * 주요 동작
 * - `responsiveRatio` (예: `'56.25%'`) 가 주어지면 자동으로 `fill` 모드 + `padding-bottom` 트릭으로
 *   가로:세로 비율을 유지한다.
 * - `width`/`height` 는 `Property.Width`/`Property.Height` 타입을 받으므로 `'100%'`, `'auto'`,
 *   숫자(px) 등 CSS 값이 모두 가능하다.
 * - `src` 가 없거나 로드에 실패하면 `fallbackSrc` 또는 비율별 기본 이미지를 시도한다 (`fallbackAspectRatio`).
 *   기본 이미지는 프로젝트에 추가한 뒤 import 해서 활성화하도록 주석으로 표시되어 있다.
 * - 외부 URL(`http`), 절대 경로(`/...`), 로컬 SVG, blob URL 처럼 `next/image` 의 blur placeholder 가
 *   적용되지 않는 케이스는 자동으로 `placeholder='empty'` 로 강제된다.
 * - 외부 URL 은 기본적으로 `unoptimized` 가 활성화된다 (호출 측에서 명시적으로 덮어쓸 수 있음).
 *
 * 일반적인 페이지 이미지에는 이 컴포넌트를, 우클릭/드래그 저장을 막아야 하는 이미지에는
 * `NextImage.Protected` (`ProtectedNextImage`) 를 사용한다.
 */
export function OriginNextImage({
  width = '100%',
  height = 'auto',
  maxWidth,
  maxHeight,
  minWidth,
  minHeight,
  responsiveRatio,
  objectFit = 'contain',
  src,
  alt = '',
  containerClassName,
  containerStyle,
  imageBoxClassName,
  imageBoxStyle,
  imageStyle,
  className,
  fill = !!responsiveRatio,
  unoptimized,
  onClick,
  containerRef,
  placeholder = 'blur',
  quality = 100,
  onError,
  fallbackAspectRatio = 'square',
  fallbackSrc,
  ...props
}: Readonly<Props>): ReactNode {
  // 실패한 src 자체를 기억한다 — boolean 플래그로 두면 src 가 새 값으로 바뀌어도 에러 상태가
  // 그대로 남아, 한 번 로드에 실패한 인스턴스는 유효한 이미지를 받아도 영영 복구되지 않는다.
  const [failedSrc, setFailedSrc] = useState<Props['src'] | null>(null);
  const isError = !src || failedSrc === src;

  const style: CSSProperties = useMemo(() => {
    const obj: CSSProperties = { objectFit: isError ? 'contain' : objectFit, ...imageStyle };
    if (!fill) {
      obj.width = width;
      obj.height = height;
    }
    return obj;
  }, [fill, height, imageStyle, isError, objectFit, width]);

  const renderSrc = useMemo(() => {
    if (!isError) return src;

    // 이미지 오류 시 처리 — 프로젝트별 기본 폴백 이미지를 쓰려면 아래 분기에서 import 한
    // 정적 이미지를 반환하도록 바꾼다 (`fallbackAspectRatio` 로 비율을 고른다).
    if (fallbackSrc) return fallbackSrc;
    if (fallbackAspectRatio === 'square') {
      // return fallbackSquare; // 정사각형 Fallback 이미지 로드, 필요시 이미지 추가 후 사용
      return undefined;
    }
    // return fallbackLandscape; // 가로 직사각형 Fallback 이미지 로드, 필요시 이미지 추가 후 사용
    return undefined;
  }, [fallbackAspectRatio, fallbackSrc, isError, src]);

  const isRemoteImage = typeof renderSrc === 'string' && renderSrc.startsWith('http');
  const isPathImage = typeof renderSrc === 'string' && renderSrc.startsWith('/');
  const isLocalSvgImage =
    (typeof renderSrc !== 'string' && !!(renderSrc as StaticImageData)?.src?.endsWith?.('svg')) ||
    (typeof renderSrc === 'string' && !renderSrc.startsWith('http') && renderSrc.endsWith('svg'));
  const isBlobImage = typeof renderSrc === 'string' && renderSrc.startsWith('blob:');
  const isUnsupportedPlaceholder = isRemoteImage || isPathImage || isLocalSvgImage || isBlobImage;

  const handleError = useCallback(
    (e: SyntheticEvent<HTMLImageElement, Event>) => {
      setFailedSrc(src ?? null);
      onError?.(e);
    },
    [onError, src]
  );

  // 표시할 이미지가 없으면(에러 + 폴백 미지정) 아무것도 그리지 않는다.
  if (!renderSrc) return null;

  const element = (
    <Image
      src={renderSrc}
      alt={alt}
      width={fill ? undefined : 0}
      height={fill ? undefined : 0}
      style={style}
      fill={fill}
      sizes="100%"
      className={cn({ 'bg-gray-300': isError }, className)}
      unoptimized={unoptimized !== undefined ? unoptimized : isRemoteImage}
      placeholder={isUnsupportedPlaceholder ? 'empty' : placeholder}
      quality={quality}
      onError={handleError}
      {...props}
    />
  );

  return (
    <div
      className={containerClassName}
      style={{ width, height, maxWidth, maxHeight, minWidth, minHeight, ...containerStyle }}
      onClick={onClick}
      ref={containerRef}
    >
      <div
        className={cn('relative h-full w-full', imageBoxClassName)}
        style={{ paddingBottom: responsiveRatio, ...imageBoxStyle }}
      >
        {responsiveRatio ? <picture className="absolute top-0 left-0 h-full w-full">{element}</picture> : element}
      </div>
    </div>
  );
}
