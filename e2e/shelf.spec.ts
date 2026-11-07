import fs from 'fs';
import path from 'path';
import { expect, Page, test } from '@playwright/test';

/**
 * E2E · 书架数据持久化
 * 书架和分组都存在 localStorage 里。集成测试已经覆盖了书架的各种操作逻辑，这里在真实浏览器里
 * 走一遍：加书 → 建分组 → 移到已有分组 → 删除，每一步之后都刷新页面，确认数据真的存下来了，
 * 并且详情页（另一个页面）读到的书架状态和书架页一致。
 *
 * 注意：不用 addInitScript 预置数据——它在每次刷新时都会重新执行，会掩盖"数据有没有真的保存"。
 * 书都通过详情页的"加入书架"按钮加进来。
 */

interface Book {
  bookId: string;
  title: string;
}

const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/db.json'), 'utf8'));
// 取三本书名互不包含的书，避免按文字定位时互相匹配
// 判断一本书的书名是否与其他书存在包含关系
function isTitleUnique(book: Book, allBooks: Book[]): boolean {
  return allBooks.every((other) => {
    if (book === other) return true; // 不和自己比
    return !other.title.includes(book.title) && !book.title.includes(other.title);
  });
}
const uniqueBooks = (db.book as Book[]).filter((b) => isTitleUnique(b, db.book as Book[]));
const [bookA, bookB, bookC]: Book[] = uniqueBooks.slice(0, 3);

const GROUP = 'Favorites';

// ---------- 定位 ----------
// 弹层关闭时不会从 DOM 移除，只是移到屏幕外，所以"是否打开"用 toBeInViewport 判断。
// 分组弹层渲染在书架的 Grid 里面，书架上的条目只取最外层 Grid 的直接子元素
const shelfItems = (page: Page) => page.locator('[class*="_list_"] > .ygm-grid > .ygm-grid-item');
const looseBook = (page: Page, title: string) =>
  shelfItems(page).filter({ has: page.locator('[class*="_bookName_"]', { hasText: title }) });
const looseBookNames = (page: Page) => shelfItems(page).locator('[class*="_bookName_"]');
const groupTile = (page: Page, name: string) =>
  shelfItems(page).filter({ has: page.locator('[class*="_groupName_"]', { hasText: name }) });
const groupTileNames = (page: Page) => shelfItems(page).locator('[class*="_groupName_"]');
const groupPopup = (page: Page) => page.locator('[class*="_groupPopup_"]');
const editBarItem = (page: Page, text: 'Move to' | 'Delete') =>
  page.locator('[class*="_editBar_"] [class*="_item_"]', { hasText: text });
const groupPicker = (page: Page) => page.locator('[class*="_editBar_"] [class*="_group_"]');
const toast = (page: Page, text: string) => page.locator('.ygm-toast').filter({ hasText: text });
const detailShelfButton = (page: Page) => page.getByText('Add to bookshelf').locator('..');

// ---------- 操作 ----------
const addToShelf = async (page: Page, book: Book) => {
  await page.goto(`/book/${book.bookId}`);
  await expect(page.getByText(book.title, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await detailShelfButton(page).click();
  await expect(toast(page, 'Added to bookshelf')).toBeVisible();
};

const openShelf = async (page: Page) => {
  await page.goto('/shelf');
  await expect(page.getByText('My Bookshelf')).toBeVisible();
};

const reloadShelf = async (page: Page) => {
  await page.reload();
  await expect(page.getByText('My Bookshelf')).toBeVisible();
};

const enterEditMode = async (page: Page) => {
  await page.getByText('Edit', { exact: true }).click();
  await expect(editBarItem(page, 'Move to')).toBeInViewport();
};

const exitEditMode = async (page: Page) => {
  await page.getByText('Finish', { exact: true }).click();
  await expect(page.getByText('Edit', { exact: true })).toBeVisible();
  await expect(editBarItem(page, 'Move to')).not.toBeInViewport();
};

const selectBook = async (page: Page, book: Book) => {
  await looseBook(page, book.title).click();
  await expect(looseBook(page, book.title).locator('.icon-selector')).toHaveClass(/_active_/);
};

const expectLooseBooks = async (page: Page, titles: string[]) => {
  await expect(looseBookNames(page)).toHaveText(titles);
};

const expectGroups = async (page: Page, groups: Record<string, Book[]>) => {
  await expect(groupTileNames(page)).toHaveText(Object.keys(groups));
  for (const [name, books] of Object.entries(groups)) {
    // 分组卡片上显示组内每本书的封面
    const covers = groupTile(page, name).locator('img');
    await expect(covers).toHaveCount(books.length);
  }
};

const expectDetailInShelf = async (page: Page, book: Book, inShelf: boolean) => {
  await page.goto(`/book/${book.bookId}`);
  await expect(page.getByText(book.title, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  if (inShelf) await expect(detailShelfButton(page)).toHaveClass(/_active_/);
  else await expect(detailShelfButton(page)).not.toHaveClass(/_active_/);
};

test.describe('书架数据持久化', () => {
  test('加书、新建分组、移到已有分组、删除分组，每一步刷新后数据都还在', async ({ page }) => {
    await test.step('从详情页加入三本书：书架按加入顺序倒序显示，刷新后还在', async () => {
      await addToShelf(page, bookA);
      await addToShelf(page, bookB);
      await addToShelf(page, bookC);

      await openShelf(page);
      await expectLooseBooks(page, [bookC.title, bookB.title, bookA.title]);
      await expect(groupTileNames(page)).toHaveCount(0);

      await reloadShelf(page);
      await expectLooseBooks(page, [bookC.title, bookB.title, bookA.title]);
    });

    await test.step('选中 A、B，新建分组：两本书移进分组，刷新后还在', async () => {
      await enterEditMode(page);
      await selectBook(page, bookA);
      await selectBook(page, bookB);

      await editBarItem(page, 'Move to').click();
      await expect(groupPicker(page)).toBeInViewport();
      await groupPicker(page).getByText('New Group').click();

      const dialog = page.locator('.ygm-dialog');
      await expect(dialog.getByRole('heading', { name: 'New Group' })).toBeVisible();
      await dialog.locator('input').fill(GROUP);
      await dialog.getByRole('button', { name: 'Submit' }).click();
      await expect(toast(page, 'Added to group')).toBeVisible();

      // 对话框关闭后，页面要能继续点击（之前怀疑关闭后有一层透明遮挡）
      await exitEditMode(page);

      await expectGroups(page, { [GROUP]: [bookA, bookB] });
      await expectLooseBooks(page, [bookC.title]);

      await reloadShelf(page);
      await expectGroups(page, { [GROUP]: [bookA, bookB] });
      await expectLooseBooks(page, [bookC.title]);
    });

    await test.step('点开分组，弹层里是组内的书；点蒙层关闭', async () => {
      await groupTile(page, GROUP).click();
      await expect(groupPopup(page)).toBeInViewport();
      await expect(groupPopup(page).locator('[class*="_bookName_"]')).toHaveText([bookA.title, bookB.title]);

      // 弹层从底部弹出、占 80% 高度，点屏幕顶部的蒙层关闭
      await page.mouse.click(20, 20);
      await expect(groupPopup(page)).not.toBeInViewport();
    });

    await test.step('详情页也认为分组里的书在书架里', async () => {
      await expectDetailInShelf(page, bookA, true);
      await openShelf(page);
    });

    await test.step('选中 C，移到已有分组：分组里有三本书，书架上没有散放的书，刷新后还在', async () => {
      await enterEditMode(page);
      await selectBook(page, bookC);

      await editBarItem(page, 'Move to').click();
      await expect(groupPicker(page)).toBeInViewport();
      await groupPicker(page).getByText(GROUP, { exact: true }).click();
      await expect(toast(page, 'Added to group')).toBeVisible();
      await exitEditMode(page);

      await expectGroups(page, { [GROUP]: [bookA, bookB, bookC] });
      await expectLooseBooks(page, []);

      await reloadShelf(page);
      await expectGroups(page, { [GROUP]: [bookA, bookB, bookC] });
      await expectLooseBooks(page, []);
    });

    await test.step('选中分组删除：书架清空，刷新后仍为空，详情页显示未加入', async () => {
      await enterEditMode(page);
      await groupTile(page, GROUP).click();
      await expect(groupTile(page, GROUP).locator('.icon-selector')).toHaveClass(/_active_/);

      await editBarItem(page, 'Delete').click();
      await expect(toast(page, 'Successfully deleted')).toBeVisible();
      // 删除后自动退出编辑模式
      await expect(page.getByText('Edit', { exact: true })).toBeVisible();

      await expect(shelfItems(page)).toHaveCount(0);
      await reloadShelf(page);
      await expect(shelfItems(page)).toHaveCount(0);

      await expectDetailInShelf(page, bookA, false);
      await expectDetailInShelf(page, bookC, false);
    });
  });

  test('只删除选中的书，其余的书保留，刷新后还在', async ({ page }) => {
    await addToShelf(page, bookA);
    await addToShelf(page, bookB);
    await openShelf(page);

    await enterEditMode(page);
    await selectBook(page, bookA);
    await editBarItem(page, 'Delete').click();
    await expect(toast(page, 'Successfully deleted')).toBeVisible();

    await expectLooseBooks(page, [bookB.title]);
    await reloadShelf(page);
    await expectLooseBooks(page, [bookB.title]);

    await expectDetailInShelf(page, bookA, false);
    await expectDetailInShelf(page, bookB, true);
  });
});
