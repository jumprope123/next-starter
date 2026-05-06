import { withSubComponents } from '@/utils';
import { OriginNextImage, ProtectedNextImage as Protected } from '.';

export * from './origin-next-image';
export * from './protected-next-image';

export const NextImage = withSubComponents(OriginNextImage, { Protected });
