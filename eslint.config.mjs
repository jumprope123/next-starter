import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      // `compiler.removeConsole` 이 production 에서 `error` 만 남기므로, lint 도 같은 기준을 따른다.
      'no-console': ['warn', { allow: ['error'] }],
    },
  },
]);

export default eslintConfig;
