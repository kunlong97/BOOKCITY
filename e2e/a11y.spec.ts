import fs from 'fs';
import path from 'path';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

/**
 * E2E · 无障碍（Accessibility）
 * 用 axe-core 按 WCAG 2.1 A / AA 规则和 axe 的最佳实践（每页一个 h1、标题层级、main 地标等）扫描每个页面，
 * 要求没有违规项。最佳实践里只关掉 region（要求所有内容都在地标里），弹层这类浮层不适合套地标。
 * axe 的检查结果和浏览器内核关系不大，只在 Chromium 上跑，节省时间。
 */

const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/db.json'), 'utf8'));
const book = db.book.find((b: { title: string }) => b.title === 'The Hobbit');

const PAGES = [
  { name: '首页', path: '/' },
  { name: '分类', path: '/category' },
  { name: '排行', path: '/ranking' },
  { name: '书单', path: '/book-list/001' },
  { name: '详情', path: `/book/${book.bookId}` },
  { name: '阅读', path: `/book/${book.bookId}/1` },
  { name: '搜索', path: '/search' },
  { name: '搜索结果', path: '/search?keyword=Hobbit' },
  { name: '书架', path: '/shelf' },
];

/** 扫描当前页面，返回便于阅读的违规列表：规则 id、严重程度、说明、出问题的元素 */
const scan = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .disableRules(['region'])
    .analyze();
  return violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
    count: v.nodes.length,
  }));
};

test.describe('无障碍', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'axe 的检查和浏览器内核无关，只在 Chromium 上跑');

  for (const target of PAGES) {
    test(`${target.name}没有无障碍违规项`, async ({ page }) => {
      await page.goto(target.path);
      await page.waitForLoadState('networkidle');

      expect(await scan(page)).toEqual([]);
    });
  }
});
