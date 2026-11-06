import fs from 'fs';
import path from 'path';
import { expect, Locator, Page, test } from '@playwright/test';

interface Book {
  bookId: string;
  title: string;
  author: string;
}
interface HomeData {
  banner: { src: string }[];
  popular: Book[];
  recommend: Book[];
  limited: Book[];
  ranking: { title: string; books: Book[] }[];
}

const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/db.json'), 'utf8'));
const home: HomeData = db.headerCarousel;

const card = (page: Page, title: string) => page.locator('.ygm-card').filter({ hasText: title });
const limitedSection = (page: Page) => page.locator('[class*="_limited_"]').first();

const openHome = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByText('Hot Picks')).toBeVisible();
};

const naturalWidth = (img: Locator) => img.evaluate((el: HTMLImageElement) => el.naturalWidth);

test.describe('首页冒烟', () => {
  test('各模块都显示出来，内容来自测试数据', async ({ page }) => {
    await openHome(page);

    await expect(page.getByText('MoocReads')).toBeVisible();
    for (const entry of ['Rankings', 'Genres', 'Completed', 'Picks']) {
      await expect(page.getByRole('heading', { name: entry, exact: true })).toBeVisible();
    }

    await expect(card(page, 'Hot Picks').getByText(home.popular[0].title).first()).toBeVisible();
    await expect(card(page, "Today's Picks").getByText(home.recommend[0].title).first()).toBeAttached();
    await expect(limitedSection(page).getByText(home.limited[0].title).first()).toBeAttached();
    await expect(card(page, 'Top Charts').getByText(home.ranking[0].title)).toBeAttached();
  });

  test('首页数据只请求一次，所有接口和图片请求都成功', async ({ page }) => {
    const failed: string[] = [];
    const homeRequests: string[] = [];

    page.on('response', (res) => {
      if (res.status() >= 400) {
        failed.push(`${res.status()} ${res.url()}`);
      }
    });
    page.on('request', (req) => {
      if (req.url().includes('/api/headerCarousel')) {
        homeRequests.push(req.url());
      }
    });

    await openHome(page);
    await page.locator('body').evaluate((body) => body.scrollTo(0, body.scrollHeight));
    await page.waitForLoadState('networkidle');

    expect(failed).toEqual([]);
    expect(homeRequests).toHaveLength(1);
  });

  test('控制台没有报错，页面没有未捕获的异常', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    await openHome(page);
    await page.locator('body').evaluate((body) => body.scrollTo(0, body.scrollHeight));
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
  });

  test('在手机屏幕上没有横向溢出', async ({ page }) => {
    await openHome(page);
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));

    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
  });

  test.describe('轮播图', () => {
    test('每一张都加载出来，按比例铺满并居中裁剪', async ({ page }) => {
      await openHome(page);

      const images = page.locator('.ygm-swiper-item img');
      await expect(images).toHaveCount(home.banner.length);
      await expect(page.locator('.ygm-swiper-page-indicator-dot')).toHaveCount(home.banner.length);

      for (const img of await images.all()) {
        await expect.poll(() => naturalWidth(img)).toBeGreaterThan(0);
        await expect(img).toHaveCSS('object-fit', 'cover');
      }
    });

    test('自动播放，播到最后一张后回到第一张', async ({ page }) => {
      await openHome(page);
      const activeDot = () =>
        page
          .locator('.ygm-swiper-page-indicator-dot')
          .evaluateAll((dots) =>
            dots.findIndex((dot) => dot.classList.contains('ygm-swiper-page-indicator-dot-active')),
          );

      const last = home.banner.length - 1;
      await expect.poll(activeDot, { timeout: 2_000 * last + 3_000 }).toBe(last);
      await expect.poll(activeDot, { timeout: 4_000 }).toBe(0);
    });
  });

  test.describe('封面懒加载', () => {
    test('首屏的封面直接加载', async ({ page }) => {
      await openHome(page);

      const firstCover = card(page, 'Hot Picks').getByAltText(home.popular[0].title);
      await expect(firstCover).toHaveAttribute('src', /\/api\/images\//);
      await expect.poll(() => naturalWidth(firstCover)).toBeGreaterThan(0);
    });

    test('首屏以外的封面先显示占位图，滚动到附近后才加载', async ({ page }) => {
      await openHome(page);

      const cover = limitedSection(page)
        .getByAltText(home.limited[home.limited.length - 1].title)
        .first();
      const outOfView = await cover.evaluate((el) => el.getBoundingClientRect().top > window.innerHeight);
      expect(outOfView).toBe(true);
      await expect(cover).toHaveAttribute('src', /^data:image/);

      await cover.scrollIntoViewIfNeeded();

      await expect(cover).toHaveAttribute('src', /\/api\/images\//);
      await expect.poll(() => naturalWidth(cover)).toBeGreaterThan(0);
    });
  });

  test('限时免费的倒计时每秒递减', async ({ page }) => {
    await openHome(page);
    const countdown = limitedSection(page).locator('.ygm-countdown');
    const seconds = async () => {
      const [h, m, s] = (await countdown.innerText()).split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };

    await expect(countdown).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    const first = await seconds();

    await expect.poll(seconds, { timeout: 3_000 }).toBeLessThan(first);
    expect(first).toBeLessThanOrEqual(3 * 3600);
  });

  test('排行模块切换榜单后，显示对应榜单的书', async ({ page }) => {
    await openHome(page);
    const ranking = card(page, 'Top Charts');
    const second = home.ranking[1];
    const firstIds = new Set(home.ranking[0].books.map((b) => b.bookId));
    const secondOnlyBook = second.books.find((book) => !firstIds.has(book.bookId))!;

    await ranking.scrollIntoViewIfNeeded();
    await expect(ranking.getByText(secondOnlyBook.title)).toBeHidden();

    await ranking.getByText(second.title, { exact: true }).click();

    await expect(ranking.getByText(secondOnlyBook.title)).toBeVisible();
  });
});