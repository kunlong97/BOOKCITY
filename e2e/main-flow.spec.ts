import fs from 'fs';
import path from 'path';
import { expect, Locator, Page, test } from '@playwright/test';

/**
 * E2E · 主流程：首页 → 搜索 → 详情 → 加入书架 → 阅读 → 书架
 * 集成测试已经分别覆盖了每个页面的逻辑，这里只验证真实浏览器里把它们串起来以后能走通：
 * 真实的路由跳转和浏览器历史、localStorage 在刷新后是否还在、跨页面的书架状态是否一致。
 */

interface Book {
  bookId: string;
  title: string;
  author: string;
}
interface ChapterInfo {
  bookId: string;
  chapterContent: { chapterId: string; chapterName: string }[];
}

// 断言用的数据直接从固定测试数据里读
const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/db.json'), 'utf8'));
const KEYWORD = 'Hobbit';
const book: Book = db.book.find((b: Book) => b.title === 'The Hobbit');
const chapters = (db.chapterInfoDetail as ChapterInfo[]).find((c) => c.bookId === book.bookId)!.chapterContent;
// 搜索是 json-server 的全文搜索（q 参数），简介里提到 hobbit 的书也会被搜出来
const searchHits: Book[] = db.bookList.filter((b: Book) =>
  JSON.stringify(b).toLowerCase().includes(KEYWORD.toLowerCase()),
);

const detailUrl = `/book/${book.bookId}`;
const chapterUrl = (n: number) => `${detailUrl}/${n}`;

// CSS Modules 的类名带哈希，用 [class*="_xxx_"] 匹配
const searchList = (page: Page) => page.locator('[class*="_searchList_"]');
const shelfButton = (page: Page) => page.getByText('Add to bookshelf').locator('..');
const button = (page: Page, name: string) => page.getByRole('button', { name });
const toast = (page: Page, text: string) => page.locator('.ygm-toast').filter({ hasText: text });
// 详情页、书架页里书名会出现在多个地方（导航栏、简介等），只看可见的那一个
const visibleText = (page: Page, text: string): Locator =>
  page.getByText(text, { exact: true }).filter({ visible: true }).first();

const expectInShelfButton = async (page: Page, inShelf: boolean) => {
  if (inShelf) {
    await expect(shelfButton(page)).toHaveClass(/_active_/);
  } else {
    await expect(shelfButton(page)).not.toHaveClass(/_active_/);
  }
};

const addToShelfFromDetail = async (page: Page) => {
  await page.goto(detailUrl);
  await expect(visibleText(page, book.title)).toBeVisible();
  await shelfButton(page).click();
  await expect(toast(page, 'Added to bookshelf')).toBeVisible();
  await expectInShelfButton(page, true);
};

test.describe('主流程', () => {
  test('从首页搜索一本书，加入书架、开始阅读、翻到下一章，再从书架找到它', async ({ page }) => {
    await test.step('首页 → 搜索页，输入框自动获得焦点', async () => {
      await page.goto('/');
      await expect(page.getByText('MoocReads')).toBeVisible();
      await page.locator('a[href="/search"]').click();

      await expect(page).toHaveURL(/\/search$/);
      await expect(page.getByPlaceholder('Search books or authors')).toBeFocused();
    });

    await test.step('输入关键词回车，URL 带上关键词，显示搜索结果', async () => {
      const input = page.getByPlaceholder('Search books or authors');
      await input.fill(KEYWORD);
      await input.press('Enter');

      await expect(page).toHaveURL(new RegExp(`[?&]keyword=${KEYWORD}`));
      for (const hit of searchHits) {
        await expect(searchList(page).getByText(hit.title, { exact: true })).toBeVisible();
      }
    });

    await test.step('点击搜索结果进入详情页，还没加入书架', async () => {
      await searchList(page).getByText(book.title, { exact: true }).click();

      await expect(page).toHaveURL(detailUrl);
      await expect(visibleText(page, book.title)).toBeVisible();
      await expect(visibleText(page, book.author)).toBeVisible();
      await expectInShelfButton(page, false);
    });

    await test.step('加入书架：弹出提示，按钮变成已加入状态', async () => {
      await shelfButton(page).click();

      await expect(toast(page, 'Added to bookshelf')).toBeVisible();
      await expectInShelfButton(page, true);
    });

    await test.step('开始阅读：进入第 1 章，显示章节名和正文', async () => {
      await button(page, 'Start Reading').click();

      await expect(page).toHaveURL(chapterUrl(1));
      await expect(page.getByRole('heading', { name: chapters[0].chapterName })).toBeVisible();
      await expect(page.locator('p').first()).toBeVisible();
    });

    await test.step('下一章：进入第 2 章', async () => {
      await button(page, 'Next Chapter').click();

      await expect(page).toHaveURL(chapterUrl(2));
      await expect(page.getByRole('heading', { name: chapters[1].chapterName })).toBeVisible();
    });

    await test.step('点正文呼出顶部栏，点首页图标回到首页', async () => {
      await page.getByRole('heading', { name: chapters[1].chapterName }).click();
      await page.locator('.icon-home').click();

      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByText('MoocReads')).toBeVisible();
    });

    await test.step('首页 → 书架，刚才加入的书在书架里', async () => {
      await page.locator('a[href="/shelf"]').click();

      await expect(page).toHaveURL(/\/shelf$/);
      await expect(page.getByText('My Bookshelf')).toBeVisible();
      await expect(visibleText(page, book.title)).toBeVisible();
      await expect(visibleText(page, book.author)).toBeVisible();
    });

    await test.step('从书架点书回到详情页，按钮仍是已加入状态', async () => {
      await visibleText(page, book.title).click();

      await expect(page).toHaveURL(detailUrl);
      await expectInShelfButton(page, true);
    });
  });

  test('书架数据存在 localStorage 里，刷新页面后还在；从详情页移出后书架清空', async ({ page }) => {
    await addToShelfFromDetail(page);

    // 刷新详情页：按钮状态来自 localStorage，不是内存里的状态
    await page.reload();
    await expect(visibleText(page, book.title)).toBeVisible();
    await expectInShelfButton(page, true);

    // 直接打开并刷新书架页
    await page.goto('/shelf');
    await page.reload();
    await expect(visibleText(page, book.title)).toBeVisible();

    // 回到详情页移出书架
    await visibleText(page, book.title).click();
    await expect(page).toHaveURL(detailUrl);
    await shelfButton(page).click();
    await expect(toast(page, 'Removed from the bookshelf')).toBeVisible();
    await expectInShelfButton(page, false);

    await page.goto('/shelf');
    await expect(page.getByText('My Bookshelf')).toBeVisible();
    await expect(page.getByText(book.title, { exact: true })).toHaveCount(0);
  });

  test('翻章用的是 replace，不会在浏览器历史里堆积章节：在第 3 章按返回直接回到详情页', async ({ page }) => {
    await page.goto(detailUrl);
    await button(page, 'Start Reading').click();
    await expect(page).toHaveURL(chapterUrl(1));

    await button(page, 'Next Chapter').click();
    await expect(page.getByRole('heading', { name: chapters[1].chapterName })).toBeVisible();
    await button(page, 'Next Chapter').click();
    await expect(page).toHaveURL(chapterUrl(3));
    await expect(page.getByRole('heading', { name: chapters[2].chapterName })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(detailUrl);
    await expect(visibleText(page, book.title)).toBeVisible();
  });
});
