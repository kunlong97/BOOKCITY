import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 测试配置。运行 npm run e2e 时会自动启动两个服务：
 *   - json-server（3102 端口）：读取 e2e/fixtures/db.json 这份固定的测试数据，不开 --watch，
 *     并通过 e2e/fixtures/paginate.js 给书单接口加上真正的分页
 *   - Vite（5179 端口）：/api 代理指向上面这个 json-server
 * 端口和日常开发用的 3002 / 5173 错开，开发服务器开着的时候也能跑 E2E。
 */
const API_PORT = 3102;
const WEB_PORT = 5179;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // 运行产物（失败截图、trace）和 HTML 报告都放在 e2e/ 下面，已在 .gitignore 中忽略
  outputDir: './e2e/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: './e2e/playwright-report', open: 'never' }]],

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // 这是一个移动端 H5 项目，用手机视口测试（同时开启触摸事件）
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],

  webServer: [
    {
      command: `npx json-server e2e/fixtures/db.json --static api-now/public --port ${API_PORT} --middlewares e2e/fixtures/paginate.js`,
      url: `http://localhost:${API_PORT}/category`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { API_TARGET: `http://localhost:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
