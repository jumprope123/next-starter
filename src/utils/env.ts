/** SSR (Node.js) 환경 여부. 불변 분기에 사용한다. */
export const isServer = typeof window === 'undefined';

/** 클라이언트(브라우저) 환경 여부. */
export const isClient = !isServer;

/** `process.env.NODE_ENV === 'development'`. */
export const isDevelopment = process.env.NODE_ENV === 'development';

/** `process.env.NODE_ENV === 'production'`. */
export const isProduction = process.env.NODE_ENV === 'production';

/** `process.env.NODE_ENV === 'test'`. */
export const isTest = process.env.NODE_ENV === 'test';
