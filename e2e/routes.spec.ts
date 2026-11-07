import fs from 'fs';
import path from 'path';
import { expect, Page, test } from '@playwright/test';

/**
 * E2E · 直接访问和刷新各个路由
 * smoke.spec.ts 只确认了直接打开各个地址返回的是页面而不是 JSON；这里更进一步：
 * 直接打开（相当于用户打开分享链接）和刷新之后，页面状态要能从 URL 完整恢复——
 * 搜索关键词、选中的榜单、书单、章节号——不能依赖从上一个页面带过来的内存状态。
 * 地址无效（参数不存在、书不存在、章节越界、未知路由）时要有合理的兜底。
 */

interface Book {
  bookId: string;
  title: string;
}
interface Ranking {
  key: string;
  shortTitle: string;
}
interface ChapterInfo {
  bookId: string;
  chapterContent: { chapterName: string }[];
}

const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/db.json'), 'utf8'));
const book: Book = db.book.find((b: Book) => b.title === 'The Hobbit');
const chapters = (db.chapterInfoDetail as ChapterInfo[]).find((c) => c.bookId === book.bookId)!.chapterContent;
const rankings: Ranking[] = db.ranking;
const rankingBooks = (key: string): Book[] => db[`rank_${key}`];
const KEYWORD = 'Hobbit';
const searchHits: Book[] = db.bookList.filter((b: Book) => JSON.stringify(b).toLowerCase().includes(KEYWORD.toLowerCase()));

const ERROR_TITLE = 'Something went wrong with this page.';

// ---------- 定位 ----------
const visibleText = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true }).first();
const searchInput = (page: Page) => page.getByPlaceholder('Search books or authors');
const searchList = (page: Page) => page.locator('[class*="_searchList_"]');
const searchHot = (page: Page) => page.getByText('Trending Searches');
const activeRanking = (page: Page) => page.locator('.ygm-sidebar-item-active');
// 未选中的榜单内容用 display: none 隐藏，只看可见的那一个
const visibleRankingList = (page: Page) => page.locator('.ygm-sidebar-content-item').filter({ visible: true });
const navTitle = (page: Page) => page.locator('.ygm-nav-bar-title');

// ---------- 断言 ----------
const expectSearchResults = async (page: Page) => {
  await expect(searchInput(page)).toHaveValue(KEYWORD);
  for (const hit of searchHits) {
    await expect(searchList(page).getByText(hit.title, { exact: true })).toBeVisible();
  }
  // 有关键词时进入搜索模式：热搜被隐藏
  await expect(searchHot(page)).toBeHidden();
};

const expectRanking = async (page: Page, ranking: Ranking) => {
  await expect(activeRanking(page)).toHaveText(ranking.shortTitle);
  await expect(visibleRankingList(page)).toHaveCount(1);
  await expect(visibleRankingList(page).getByText(rankingBooks(ranking.key)[0].title, { exact: true }).first()).toBeVisible();
};

const expectErrorPage = async (page: Page) => {
  await expect(page.getByText(ERROR_TITLE)).toBeVisible();
};

/** 直接打开 url 检查一次，刷新后再检查一次，URL 保持不变 */
const openAndReload = async (page: Page, url: string, check: () => Promise<void>) => {
  await page.goto(url);
  await check();
  const urlBefore = page.url();

  await page.reload();
  await check();
  expect(page.url()).toBe(urlBefore);
};

test.describe('直接打开并刷新，页面状态从 URL 恢复', () => {
  test('首页', async ({ page }) => {
    await openAndReload(page, '/', async () => {
      await expect(page.getByText('MoocReads')).toBeVisible();
      await expect(page.getByText('Hot Picks')).toBeVisible();
    });
  });

  test('搜索页（带关键词）：输入框填上关键词，显示搜索结果', async ({ page }) => {
    await openAndReload(page, `/search?keyword=${KEYWORD}`, () => expectSearchResults(page));
  });

  test('搜索页（不带关键词）：输入框为空，显示热搜', async ({ page }) => {
    await openAndReload(page, '/search', async () => {
      await expect(searchInput(page)).toHaveValue('');
      await expect(searchHot(page)).toBeVisible();
      await expect(searchList(page)).toBeHidden();
    });
  });

  test('分类页', async ({ page }) => {
    await openAndReload(page, '/category', async () => {
      await expect(navTitle(page)).toHaveText('Category');
      for (const category of db.category.slice(0, 3)) {
        await expect(visibleText(page, category.name)).toBeVisible();
      }
    });
  });

  test('书单页：标题和第一页的书', async ({ page }) => {
    const firstPage: Book[] = db.bookList_001.bookList;
    await openAndReload(page, '/book-list/001', async () => {
      await expect(navTitle(page)).toHaveText('Mystery & Thriller');
      await expect(visibleText(page, firstPage[0].title)).toBeVisible();
    });
  });

  test('排行页（带 ?key=）：选中 URL 指定的榜单', async ({ page }) => {
    await openAndReload(page, `/ranking?key=${rankings[1].key}`, () => expectRanking(page, rankings[1]));
  });

  test('排行页（不带 key）：默认选中第一个榜单', async ({ page }) => {
    await openAndReload(page, '/ranking', () => expectRanking(page, rankings[0]));
  });

  test('详情页', async ({ page }) => {
    await openAndReload(page, `/book/${book.bookId}`, async () => {
      await expect(visibleText(page, book.title)).toBeVisible();
      await expect(page.getByText('Add to bookshelf')).toBeVisible();
    });
  });

  test('阅读页：打开 URL 指定的章节', async ({ page }) => {
    await openAndReload(page, `/book/${book.bookId}/3`, async () => {
      await expect(page.getByRole('heading', { name: chapters[2].chapterName })).toBeVisible();
    });
  });

  test('书架页', async ({ page }) => {
    await openAndReload(page, '/shelf', async () => {
      await expect(page.getByText('My Bookshelf')).toBeVisible();
    });
  });
});

test.describe('页面内改变的状态写进 URL，刷新后保留', () => {
  test('排行页切换榜单后刷新，仍是切换后的榜单', async ({ page }) => {
    await page.goto('/ranking');
    await expectRanking(page, rankings[0]);

    await page.locator('.ygm-sidebar-item').filter({ hasText: rankings[2].shortTitle }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]key=${rankings[2].key}`));
    await expectRanking(page, rankings[2]);

    await page.reload();
    await expectRanking(page, rankings[2]);
  });

  test('搜索页输入关键词后刷新，仍显示这个关键词的结果', async ({ page }) => {
    await page.goto('/search');
    await searchInput(page).fill(KEYWORD);
    await searchInput(page).press('Enter');
    await expect(page).toHaveURL(new RegExp(`[?&]keyword=${KEYWORD}`));

    await page.reload();
    await expectSearchResults(page);
  });

  test('阅读页翻到下一章后刷新，仍是这一章', async ({ page }) => {
    await page.goto(`/book/${book.bookId}/1`);
    await page.getByRole('button', { name: 'Next Chapter' }).click();
    await expect(page).toHaveURL(new RegExp(`/book/${book.bookId}/2$`));

    await page.reload();
    await expect(page.getByRole('heading', { name: chapters[1].chapterName })).toBeVisible();
  });
});

test.describe('地址无效时的兜底', () => {
  test('排行页的 key 不存在：回退到第一个榜单', async ({ page }) => {
    await page.goto('/ranking?key=999');
    await expectRanking(page, rankings[0]);
  });

  test('书单不存在：显示错误页', async ({ page }) => {
    await page.goto('/book-list/999');
    await expectErrorPage(page);
  });

  test('书不存在：详情页显示错误页', async ({ page }) => {
    await page.goto('/book/000-0000000000');
    await expectErrorPage(page);
  });

  test('章节号超出范围：阅读页显示错误页，不会白屏', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(`/book/${book.bookId}/${chapters.length + 1}`);
    await expectErrorPage(page);
    expect(errors).toEqual([]);
  });

  test('未知路由：重定向到首页', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Hot Picks')).toBeVisible();
  });
});
