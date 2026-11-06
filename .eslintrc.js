const base = require('@taoyage/configs/eslint-ts');

module.exports = {
  ...base,
  rules: {
    ...base.rules,
    // 共享配置里这两条规则在新版 typescript-eslint 中已被移除，启用会报 "Definition for rule ... was not found"
    '@typescript-eslint/no-duplicate-imports': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
  },
  overrides: [
    ...(base.overrides || []),
    {
      // .js 文件（各种配置、E2E 的 Node 脚本、Jest 替身）不在任何 tsconfig 里，没有类型信息；
      // 共享配置对所有文件都开了需要类型信息的规则，会让 ESLint 直接崩溃，这里对 .js 关掉这类规则
      files: ['*.js', '*.cjs', '*.mjs'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
      rules: {
        // eslint-plugin-import 按 package.json 的 main 去读 CJS 产物，认不出 module.exports.default，
        // 会把 vite.config.js 里的 import react from '@vitejs/plugin-react' 误报为没有默认导出
        'import/default': 'off',
      },
    },
    {
      // E2E 用例和 Playwright 配置不在根 tsconfig（只包含 src）里，
      // 让类型相关的 lint 规则改用 e2e/tsconfig.json，否则会报 "file was not found in any of the provided project(s)"
      files: ['e2e/**/*.ts', 'playwright.config.ts'],
      parserOptions: {
        project: './e2e/tsconfig.json',
      },
    },
    {
      // 测试文件天然有 describe → test → 事件监听 → 回调 这样的嵌套，放宽回调层数限制
      files: ['e2e/**/*.ts', 'src/**/__tests__/**/*.{ts,tsx}'],
      rules: {
        'max-nested-callbacks': ['error', 6],
      },
    },
  ],
};
