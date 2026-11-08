/**
 * ESLint 9 flat config。
 * 规则原先来自 @taoyage/configs/eslint-ts（旧的 .eslintrc 格式，ESLint 9 已不再读取），
 * 现在原样搬到 eslint/rules/ 下，这里只负责把插件、解析器和各类文件的差异组装起来。
 */
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const importPlugin = require('eslint-plugin-import');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const prettierConfig = require('eslint-config-prettier/flat');
const globals = require('globals');

module.exports = [
  {
    // 原 .eslintignore 只有 *.d.ts；构建产物和 Playwright 报告之前没被扫描到只是因为 ESLint 跑不起来
    ignores: ['**/*.d.ts', 'dist/**', 'e2e/test-results/**', 'e2e/playwright-report/**'],
  },

  reactPlugin.configs.flat.recommended,
  reactHooks.configs['recommended-latest'],
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.warnings,
  importPlugin.flatConfigs.typescript,
  prettierConfig,

  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2015,
        ...globals.jest,
        ...globals.node,
        ...globals.worker,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/parsers': {
        [require.resolve('@typescript-eslint/parser')]: ['.ts', '.tsx', '.d.ts'],
      },
      'import/resolver': {
        alias: {
          map: [['@', './src']],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      },
    },
    rules: {
      ...require('./eslint/rules/base'),
      ...require('./eslint/rules/jsx'),
      ...require('./eslint/rules/react'),
      ...require('./eslint/rules/typescript'),
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          globalReturn: false,
          impliedStrict: true,
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    rules: {
      // TS 文件里未定义的变量由 tsc 检查；no-undef 不认识 React.ReactNode 这类类型位置的全局命名空间，
      // 会误报（typescript-eslint 官方也建议对 TS 文件关掉）
      'no-undef': 'off',
    },
  },

  {
    // E2E 用例和 Playwright 配置不在根 tsconfig（只包含 src）里，
    // 让类型相关的 lint 规则改用 e2e/tsconfig.json，否则会报 "file was not found in any of the provided project(s)"
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        project: './e2e/tsconfig.json',
      },
    },
  },

  {
    // .js 文件（各种配置、E2E 的 Node 脚本、Jest 替身）不在任何 tsconfig 里，没有类型信息，
    // 需要类型信息的规则会让 ESLint 直接崩溃，这里对 .js 关掉这类规则
    files: ['**/*.{js,jsx,mjs,cjs}'],
    ...tsPlugin.configs['flat/disable-type-checked'],
    rules: {
      ...tsPlugin.configs['flat/disable-type-checked'].rules,
      // eslint-plugin-import 按 package.json 的 main 去读 CJS 产物，认不出 module.exports.default，
      // 会把 vite.config.mjs 里的 import react from '@vitejs/plugin-react' 误报为没有默认导出
      'import/default': 'off',
    },
  },

  {
    // 测试文件天然有 describe → test → 事件监听 → 回调 这样的嵌套，放宽回调层数限制
    files: ['e2e/**/*.ts', 'src/**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'max-nested-callbacks': ['error', 6],
    },
  },

  {
    // jsdom 不做布局，测试里要手造 DOMRect、IntersectionObserverEntry、AxiosResponse 这类对象的一部分字段，
    // 用 `{ ... } as T` 是最直接的写法；改成满足规则只能写 `as unknown as T`，反而更不安全。业务代码仍然禁止
    files: ['e2e/**/*.ts', 'src/**/__tests__/**/*.{ts,tsx}', 'src/test-utils/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow' },
      ],
    },
  },
];
