import { expect, test } from '@playwright/test';

/**
 * 冒烟测试：确认 E2E 的基础环境是通的——两个服务都起来了、页面用的是固定测试数据、
 * /api 代理和页面路由不再冲突、分页中间件生效。具体业务流程的用例写在其他文件里。
 */

// 固定测试数据（e2e/fixtures/db.json）里的一本书
const BOOK_ID = '978-0451524335';
const BOOK_TITLE = '1984';

test.describe('接口服务', () => {
  test('通过 /api 前缀访问 json-server', async ({ request }) => {
    const res = await request.get('/api/category');

    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('application/json');
    const categories = await res.json();
    expect(categories.length).toBeGreaterThan(0);
  });

  test('书单接口按 pageIndex 分页，最后一页 isLast 为 true', async ({ request }) => {
    const page1 = await (await request.get('/api/bookList_001?pageIndex=1')).json();
    const page2 = await (await request.get('/api/bookList_001?pageIndex=2')).json();

    expect(page1.bookList).toHaveLength(4);
    expect(page1.isLast).toBe(false);
    expect(page2.bookList).toHaveLength(3);
    expect(page2.isLast).toBe(true);
    // 两页的书不重复
    const ids = [...page1.bookList, ...page2.bookList].map((book: { bookId: string }) => book.bookId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('图片通过 /api 代理加载', async ({ request }) => {
    const res = await request.get('/api/images/banner1.png');

    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('image');
  });
});

test.describe('页面', () => {
  test('首页用固定测试数据渲染，轮播图能加载出来', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Hot Picks')).toBeVisible();
    const banner = page.locator('.ygm-swiper-item img').first();
    await expect(banner).toHaveAttribute('src', /\/api\/images\//);
    await expect.poll(() => banner.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  // 之前这些地址会被 Vite 代理转给 json-server，拿到的是 JSON 而不是页面
  const routes: Array<[string, string]> = [
    ['/category', 'Mystery & Thriller'],
    ['/ranking', 'Popular List'],
    ['/ranking?key=002', 'Bestseller list'],
    ['/book-list/001', 'Mystery & Thriller'],
    [`/book/${BOOK_ID}`, 'Add to bookshelf'],
    [`/book/${BOOK_ID}/1`, 'Next Chapter'],
    ['/search?keyword=Hobbit', 'The Hobbit'],
    ['/shelf', 'My Bookshelf'],
  ];

  for (const [path, text] of routes) {
    test(`直接打开 ${path} 显示页面而不是 JSON`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.headers()['content-type']).toContain('text/html');
      // 隐藏的区块只是加了 CSS 类名、DOM 还在（比如搜索后的热搜标签），只看可见的元素
      await expect(page.getByText(text).filter({ visible: true }).first()).toBeVisible();
    });
  }

  test('在详情页刷新，仍然是详情页', async ({ page }) => {
    await page.goto(`/book/${BOOK_ID}`);
    await expect(page.getByText('Add to bookshelf')).toBeVisible();

    await page.reload();

    await expect(page.getByText('Add to bookshelf')).toBeVisible();
    await expect(page.locator('.bookInfo, [class*=bookInfo]').getByText(BOOK_TITLE).first()).toBeVisible();
  });
});
