import { withSubComponents } from '@/utils';
import { OriginNextImage } from './origin-next-image';
import { ProtectedNextImage as Protected } from './protected-next-image';

export * from './origin-next-image';
export * from './protected-next-image';

export const NextImage = withSubComponents(OriginNextImage, { Protected });
