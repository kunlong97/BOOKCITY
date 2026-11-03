import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  books,
  currentUrl,
  httpError,
  mockApi,
  networkError,
  readGroups,
  readShelf,
  renderApp,
  seedShelf,
} from '@/test-utils';

const { orwell, hobbit, farm } = books;

const openDetail = async (bookId = 'book-1') => {
  const result = renderApp(`/book/${bookId}`);
  await screen.findByText('Add to bookshelf');
  return result;
};

const shelfButton = () => screen.getByText('Add to bookshelf').closest('.icon') as HTMLElement;
const inShelf = () => shelfButton().classList.contains('active');
const clickShelf = () => fireEvent.click(screen.getByText('Add to bookshelf'));

// 详情页上“最新三章”区域（目录弹窗里也有同名章节，这里排除掉）
const latestChapters = () =>
  Array.from(document.querySelectorAll('.catalogItem'))
    .filter((el) => !el.closest('.ygm-popup'))
    .map((el) => el.textContent);

const catalogPopup = () => document.querySelector('.ygm-popup') as HTMLElement;
const catalogMask = () => catalogPopup().querySelector('.ygm-mask') as HTMLElement;
const catalogOpen = () => catalogMask().style.display !== 'none';

const errorBlock = () => document.querySelector('.ygm-error-block');

describe('详情页', () => {
  describe('展示', () => {
    it('显示书名、作者、分类、字数和连载状态', async () => {
      mockApi();
      await openDetail();

      const info = document.querySelector('.bookInfo') as HTMLElement;
      expect(within(info).getByText('1984')).toBeTruthy();
      expect(within(info).getByText('George Orwell')).toBeTruthy();
      expect(within(info).getByText('Dystopian Fiction')).toBeTruthy();
      expect(within(info).getByText('320 million words / Completed')).toBeTruthy();
    });

    it('连载中的书显示 Ongoing', async () => {
      mockApi({ '/book': [{ ...orwell, isSerial: true }] });
      await openDetail();

      expect(screen.getByText('320 million words / Ongoing')).toBeTruthy();
    });

    it('显示简介', async () => {
      mockApi();
      await openDetail();

      expect(screen.getByText('Description of 1984')).toBeTruthy();
    });

    it('倒序显示最新的三章', async () => {
      mockApi();
      await openDetail();

      expect(latestChapters()).toEqual(['Chapter 5 of 1984', 'Chapter 4 of 1984', 'Chapter 3 of 1984']);
    });

    it('显示第一章的标题和试读内容', async () => {
      mockApi();
      await openDetail();

      // 试读内容是单独请求的，等它加载完
      expect(await screen.findByText('First paragraph of the chapter.')).toBeTruthy();

      const content = document.querySelector('.detailContent') as HTMLElement;
      expect(within(content).getByRole('heading').textContent).toBe('Chapter 1 of 1984');
      expect(within(content).getByText('Second paragraph of the chapter.')).toBeTruthy();
    });

    it('按 URL 里的 id 请求对应的书', async () => {
      const api = mockApi();
      await openDetail('book-2');

      expect(api.callsTo('/book')[0].query.bookId).toBe('book-2');
      expect(screen.getAllByText('The Hobbit').length).toBeGreaterThan(0);
    });
  });

  describe('加入/移出书架', () => {
    it('不在书架时，点击加入书架，提示成功，按钮变为已加入状态', async () => {
      mockApi();
      await openDetail();
      expect(inShelf()).toBe(false);

      clickShelf();

      expect(await screen.findByText('Added to bookshelf')).toBeTruthy();
      expect(inShelf()).toBe(true);
      expect(readShelf().map((b) => b.bookId)).toEqual(['book-1']);
    });

    it('已在书架时打开页面，按钮直接是已加入状态', async () => {
      mockApi();
      seedShelf([orwell]);
      await openDetail();

      expect(inShelf()).toBe(true);
    });

    it('已在书架时点击，移出书架，提示成功', async () => {
      mockApi();
      seedShelf([orwell, hobbit]);
      await openDetail();

      clickShelf();

      expect(await screen.findByText('Removed from the bookshelf')).toBeTruthy();
      expect(inShelf()).toBe(false);
      expect(readShelf().map((b) => b.bookId)).toEqual(['book-2']);
    });

    it('书在分组里时也算已加入，点击后从分组中移除', async () => {
      mockApi();
      seedShelf([], { Classic: [orwell, farm] });
      await openDetail();
      expect(inShelf()).toBe(true);

      clickShelf();

      expect(await screen.findByText('Removed from the bookshelf')).toBeTruthy();
      expect(inShelf()).toBe(false);
      expect(readGroups().Classic.map((b) => b.bookId)).toEqual(['book-3']);
      expect(readShelf()).toEqual([]);
    });

    it('连续点击两次回到原来的状态', async () => {
      mockApi();
      await openDetail();

      clickShelf();
      await screen.findByText('Added to bookshelf');
      clickShelf();

      expect(await screen.findByText('Removed from the bookshelf')).toBeTruthy();
      expect(inShelf()).toBe(false);
      expect(readShelf()).toEqual([]);
    });

    it('加入的是完整的书籍信息，书架页可以直接展示', async () => {
      mockApi();
      await openDetail();

      clickShelf();
      await screen.findByText('Added to bookshelf');

      expect(readShelf()[0]).toMatchObject({ bookId: 'book-1', title: '1984', author: 'George Orwell' });
    });
  });

  describe('Catalog', () => {
    it('默认不打开，点 Catalog 打开，显示全部章节', async () => {
      mockApi();
      await openDetail();
      expect(catalogOpen()).toBe(false);

      fireEvent.click(screen.getByText('Catalog'));

      expect(catalogOpen()).toBe(true);
      const items = Array.from(catalogPopup().querySelectorAll('.catalogItem')).map((el) => el.textContent);
      expect(items).toEqual(orwell.chapters);
    });

    it('点目录里的章节，进入该章节的阅读页', async () => {
      mockApi();
      await openDetail();
      fireEvent.click(screen.getByText('Catalog'));

      const chapter3 = Array.from(catalogPopup().querySelectorAll('.catalogItem')).find(
        (el) => el.textContent === 'Chapter 3 of 1984',
      ) as HTMLElement;
      fireEvent.click(chapter3);

      expect(await screen.findByText('Paragraph one of chapter 3.')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-1/3');
    });

    it('从阅读页返回详情页时，目录是关闭的', async () => {
      mockApi();
      await openDetail();
      fireEvent.click(screen.getByText('Catalog'));
      fireEvent.click(
        Array.from(catalogPopup().querySelectorAll('.catalogItem')).find(
          (el) => el.textContent === 'Chapter 2 of 1984',
        ) as HTMLElement,
      );
      await screen.findByText('Paragraph one of chapter 2.');

      act(() => {
        window.history.back();
      });

      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
      expect(catalogOpen()).toBe(false);
    });

    it('点蒙层关闭目录', async () => {
      mockApi();
      await openDetail();
      fireEvent.click(screen.getByText('Catalog'));

      fireEvent.click(catalogMask());

      await waitFor(() => expect(catalogOpen()).toBe(false));
    });
  });

  describe('页面跳转', () => {
    it('点 Start Reading 进入第一章', async () => {
      mockApi();
      await openDetail();

      fireEvent.click(screen.getByText('Start Reading'));

      expect(await screen.findByText('Paragraph one of chapter 1.')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-1/1');
    });

    it('点 Back 返回上一页', async () => {
      mockApi();
      renderApp('/');
      fireEvent.click(await screen.findByText('Description of 1984'));
      await screen.findByText('Add to bookshelf');

      fireEvent.click(screen.getByText('Back'));

      expect(await screen.findByText('Hot Picks')).toBeTruthy();
      expect(currentUrl()).toBe('/');
    });

    it('页面滚动后，导航栏显示书名', async () => {
      mockApi();
      await openDetail();
      const navTitle = () => (document.querySelector('.ygm-nav-bar-title') as HTMLElement).textContent;
      expect(navTitle()).toBe('');

      const scroller = document.createElement('div');
      document.body.appendChild(scroller);
      act(() => {
        fireEvent.scroll(scroller, { target: { scrollTop: 300 } });
      });

      expect(navTitle()).toBe('1984');

      act(() => {
        fireEvent.scroll(scroller, { target: { scrollTop: 0 } });
      });
      expect(navTitle()).toBe('');
      scroller.remove();
    });
  });

  describe('请求状态', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('书籍信息加载中显示加载动画', async () => {
      let resolve!: (value: unknown) => void;
      mockApi({ '/book': () => new Promise((res) => (resolve = res)) });

      renderApp('/book/book-1');

      await waitFor(() => expect(resolve).toBeDefined());
      expect(document.querySelector('.ygm-spinner-loading')).not.toBeNull();

      await act(async () => resolve([orwell]));
      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
    });

    it.each([
      ['接口报错', httpError(500)],
      ['断网', networkError()],
    ])('书籍信息%s时显示错误页', async (_label, failure) => {
      mockApi({ '/book': failure });

      renderApp('/book/book-1');

      await waitFor(() => expect(errorBlock()).not.toBeNull());
      expect(screen.queryByText('Add to bookshelf')).toBeNull();
    });

    it('书不存在时显示错误页，不会一直停在加载中', async () => {
      const api = mockApi();

      renderApp('/book/not-exist');

      await waitFor(() => expect(errorBlock()).not.toBeNull());
      expect(document.querySelector('.ygm-spinner-loading')).toBeNull();
      expect(api.callsTo('/book')).toHaveLength(1);
    });

    it('试读内容加载失败时，只是不显示试读，页面其他部分正常', async () => {
      mockApi({ '/chapterInfo': httpError(500) });
      await openDetail();

      await waitFor(() => expect(screen.getByText('Start Reading')).toBeTruthy());
      expect(document.querySelector('.detailContent')).toBeNull();
      expect(errorBlock()).toBeNull();
    });
  });
});
