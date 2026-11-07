import fs from 'fs';
import path from 'path';
import { expect, Page, test } from '@playwright/test';

/**
 * E2E · 浏览器前进和后退
 * 在真实的浏览器历史里验证：
 * - 只改变页面内状态的操作（搜索换关键词、排行切换榜单）用 replace，不在历史里堆积记录；
 * - 从详情页后退，回到的页面要恢复离开时的状态（关键词、选中的榜单），而不是回到初始状态；
 * - 前进能回到刚才的页面；页面上的"返回"按钮和浏览器后退效果一致。
 * 阅读页翻章用 replace 的场景已经在 main-flow.spec.ts 里覆盖。
 */

interface Book {
  bookId: string;
  title: string;
}
interface Ranking {
  key: string;
  shortTitle: string;
}

const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/db.json'), 'utf8'));
const hitsOf = (keyword: string): Book[] =>
  db.bookList.filter((b: Book) => JSON.stringify(b).toLowerCase().includes(keyword.toLowerCase()));
const FIRST_KEYWORD = 'Hobbit';
const SECOND_KEYWORD = 'Educated';
const rankings: Ranking[] = db.ranking;
const rankingBooks = (key: string): Book[] => db[`rank_${key}`];
const finishedBooks: Book[] = db.bookList_finish.bookList ?? db.bookList_finish;

// ---------- 定位 ----------
const searchInput = (page: Page) => page.getByPlaceholder('Search books or authors');
const searchList = (page: Page) => page.locator('[class*="_searchList_"]');
const activeRanking = (page: Page) => page.locator('.ygm-sidebar-item-active');
const visibleRankingList = (page: Page) => page.locator('.ygm-sidebar-content-item').filter({ visible: true });
const navBack = (page: Page) => page.locator('.ygm-nav-bar-left').filter({ visible: true }).first();
const navTitle = (page: Page) => page.locator('.ygm-nav-bar-title');

// ---------- 断言 ----------
const expectHome = async (page: Page) => {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Hot Picks')).toBeVisible();
};

const expectDetail = async (page: Page, book: Book) => {
  await expect(page).toHaveURL(new RegExp(`/book/${book.bookId}$`));
  await expect(page.getByText('Add to bookshelf')).toBeVisible();
  await expect(page.getByText(book.title, { exact: true }).filter({ visible: true }).first()).toBeVisible();
};

const expectSearchResults = async (page: Page, keyword: string) => {
  await expect(page).toHaveURL(new RegExp(`/search\\?keyword=${keyword}$`));
  await expect(searchInput(page)).toHaveValue(keyword);
  for (const hit of hitsOf(keyword)) {
    await expect(searchList(page).getByText(hit.title, { exact: true })).toBeVisible();
  }
};

const expectRanking = async (page: Page, ranking: Ranking) => {
  // 从首页进来时 URL 不带 key，默认选中第一个榜单
  const keyPattern = ranking.key === rankings[0].key ? `(\\?key=${ranking.key})?` : `\\?key=${ranking.key}`;
  await expect(page).toHaveURL(new RegExp(`/ranking${keyPattern}$`));
  await expect(activeRanking(page)).toHaveText(ranking.shortTitle);
  await expect(visibleRankingList(page).getByText(rankingBooks(ranking.key)[0].title, { exact: true }).first()).toBeVisible();
};

// ---------- 操作 ----------
const search = async (page: Page, keyword: string) => {
  await searchInput(page).fill(keyword);
  await searchInput(page).press('Enter');
  await expectSearchResults(page, keyword);
};

const openHome = async (page: Page) => {
  await page.goto('/');
  await expectHome(page);
};

test.describe('浏览器前进和后退', () => {
  test('搜索：换关键词不堆积历史；从详情页后退回到最后一次搜索的结果，再后退回到首页', async ({ page }) => {
    await openHome(page);
    await page.locator('a[href="/search"]').click();
    await expect(page).toHaveURL(/\/search$/);

    await search(page, FIRST_KEYWORD);
    await search(page, SECOND_KEYWORD);

    const book = hitsOf(SECOND_KEYWORD)[0];
    await searchList(page).getByText(book.title, { exact: true }).click();
    await expectDetail(page, book);

    await page.goBack();
    await expectSearchResults(page, SECOND_KEYWORD);

    // 两次搜索都没有新增历史记录：再后退一次就回到首页
    await page.goBack();
    await expectHome(page);

    await page.goForward();
    await expectSearchResults(page, SECOND_KEYWORD);
    await page.goForward();
    await expectDetail(page, book);
  });

  test('搜索页点"取消"回到上一页', async ({ page }) => {
    await openHome(page);
    await page.locator('a[href="/search"]').click();
    await search(page, FIRST_KEYWORD);

    await page.getByText('Cancel', { exact: true }).click();
    await expectHome(page);
  });

  test('排行：切换榜单不堆积历史；从详情页后退回到切换后的榜单，再后退回到首页', async ({ page }) => {
    await openHome(page);
    await page.getByRole('heading', { name: 'Rankings', exact: true }).click();
    await expectRanking(page, rankings[0]);

    for (const ranking of [rankings[1], rankings[2]]) {
      await page.locator('.ygm-sidebar-item').filter({ hasText: ranking.shortTitle }).click();
      await expectRanking(page, ranking);
    }

    const book = rankingBooks(rankings[2].key)[0];
    await visibleRankingList(page).getByText(book.title, { exact: true }).first().click();
    await expectDetail(page, book);

    // 用详情页导航栏上的"返回"，效果应和浏览器后退一致
    await navBack(page).click();
    await expectRanking(page, rankings[2]);

    // 两次切换榜单都用 replace：再后退一次就回到首页
    await page.goBack();
    await expectHome(page);

    await page.goForward();
    await expectRanking(page, rankings[2]);
  });

  test('书单：进入详情页后用"返回"回到书单，再返回回到首页', async ({ page }) => {
    await openHome(page);
    await page.getByRole('heading', { name: 'Completed', exact: true }).click();
    await expect(page).toHaveURL(/\/book-list\/finish$/);
    await expect(navTitle(page).filter({ visible: true })).toHaveText('Completed');

    const book = finishedBooks[0];
    await page.getByText(book.title, { exact: true }).filter({ visible: true }).first().click();
    await expectDetail(page, book);

    await navBack(page).click();
    await expect(page).toHaveURL(/\/book-list\/finish$/);
    await expect(page.getByText(book.title, { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await navBack(page).click();
    await expectHome(page);
  });

  test('阅读：顶部栏的返回回到详情页，浏览器前进再回到阅读页', async ({ page }) => {
    const book: Book = db.book.find((b: Book) => b.title === 'The Hobbit');
    await page.goto(`/book/${book.bookId}`);
    await expectDetail(page, book);

    await page.getByRole('button', { name: 'Start Reading' }).click();
    await expect(page).toHaveURL(new RegExp(`/book/${book.bookId}/1$`));

    // 点正文呼出顶部栏，再点返回
    await page.getByRole('heading').first().click();
    await navBack(page).click();
    await expectDetail(page, book);

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/book/${book.bookId}/1$`));
    await expect(page.getByRole('button', { name: 'Next Chapter' })).toBeVisible();
  });
});
