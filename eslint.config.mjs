import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * Cache Components — 모든 page 는 default export 를 `freshOnNavigation` / `noRoutePreserve` 로 감싼다.
 * 감싸지 않은 page 는 링크로 다시 들어와도 옛 state 가 남아, `useState(initialX)` 가 서버의 새 값을 받지 않는다
 * (주문서라면 고른 것과 다른 품목이 주문된다). docs/cache-components-guide.md §4.
 */
const PAGE_WRAPPERS = ['freshOnNavigation', 'noRoutePreserve'];
const pageRoutePreserveRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      missing:
        'page 의 default export 는 freshOnNavigation(Page) 또는 noRoutePreserve(Page) 로 감싸야 합니다 (@/components). ' +
        '탐색 화면(목록·상세·검색)은 freshOnNavigation, 그 외(거래·마이페이지·어드민·폼)는 noRoutePreserve — docs/cache-components-guide.md §4.',
    },
  },
  create(context) {
    let hasDefaultExport = false;
    return {
      ExportDefaultDeclaration(node) {
        hasDefaultExport = true;
        const d = node.declaration;
        const isWrapped =
          d.type === 'CallExpression' && d.callee.type === 'Identifier' && PAGE_WRAPPERS.includes(d.callee.name);
        if (!isWrapped) context.report({ node, messageId: 'missing' });
      },
      'Program:exit'(node) {
        if (!hasDefaultExport) context.report({ node, messageId: 'missing' });
      },
    };
  },
};

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
  {
    files: ['src/app/**/page.tsx'],
    plugins: { app: { rules: { 'page-route-preserve': pageRoutePreserveRule } } },
    rules: {
      'app/page-route-preserve': 'error',
    },
  },
]);

export default eslintConfig;
