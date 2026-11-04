import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import {
  books,
  currentUrl,
  httpError,
  mockApi,
  MockRequest,
  networkError,
  pagedBookList,
  renderApp,
  setIntersecting,
} from '@/test-utils';

const { orwell, hobbit, farm, gatsby } = books;

const bookNames = () => Array.from(document.querySelectorAll('.bookName')).map((el) => el.textContent);
const sentinel = () => document.querySelector('.ygm-infinite-scroll-load') as HTMLElement;
const bottomSpinner = () => sentinel()?.querySelector('.ygm-spinner-loading');
const pageRequests = (api: ReturnType<typeof mockApi>, path = '/bookList_001') =>
  api.callsTo(path).map((call) => Number(call.query.pageIndex));

// 模拟滚动到列表底部
const scrollToBottom = () => setIntersecting(true, sentinel());
const scrollAway = () => setIntersecting(false, sentinel());

const openList = async (key = '001') => {
  const result = renderApp(`/book-list/${key}`);
  await waitFor(() => expect(document.querySelector('.bookName')).not.toBeNull());
  return result;
};

describe('书单页', () => {
  describe('展示', () => {
    it('显示书单标题和第一页的书', async () => {
      mockApi();
      await openList('001');

      expect(screen.getByText('Mystery & Thriller')).toBeTruthy();
      expect(bookNames()).toEqual(['1984', 'The Hobbit']);
      expect(screen.getByText('Description of 1984')).toBeTruthy();
      expect(screen.getByText('George Orwell·Dystopian Fiction')).toBeTruthy();
    });

    it('按书单 key 请求第 1 页', async () => {
      const api = mockApi();
      await openList('finish');

      expect(api.callsTo('/bookList_finish')[0].query.pageIndex).toBe('1');
      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it.each([
      ['hotpicks', 'Hot Picks'],
      ['todaypicks', "Today's Picks"],
      ['recommend', 'Recommended'],
    ])('首页入口的书单 %s 显示标题 %s', async (key, title) => {
      mockApi();
      await openList(key);

      expect(screen.getByText(title)).toBeTruthy();
    });

    it('书单为空时不显示书，也不显示加载更多', async () => {
      mockApi({ '/bookList_001': pagedBookList([[]]) });

      renderApp('/book-list/001');

      expect(await screen.findByText('Mystery & Thriller')).toBeTruthy();
      expect(bookNames()).toEqual([]);
      expect(bottomSpinner()).toBeFalsy();
    });
  });

  describe('滚动加载', () => {
    it('还有下一页时，底部显示加载动画', async () => {
      mockApi();
      await openList('001');

      expect(bottomSpinner()).not.toBeNull();
    });

    it('没有滚到底部时不加载下一页', async () => {
      const api = mockApi();
      await openList('001');

      expect(pageRequests(api)).not.toContain(2);
    });

    it('滚到底部加载下一页，追加在后面', async () => {
      const api = mockApi();
      await openList('001');

      scrollToBottom();

      await waitFor(() => expect(bookNames()).toEqual(['1984', 'The Hobbit', 'Animal Farm']));
      expect(pageRequests(api)).toContain(2);
    });

    it('加载到最后一页后，底部不再显示加载动画，也不再请求', async () => {
      const api = mockApi();
      await openList('001');

      scrollToBottom();
      await waitFor(() => expect(bookNames()).toHaveLength(3));

      expect(bottomSpinner()).toBeFalsy();
      scrollAway();
      scrollToBottom();
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
      expect(pageRequests(api)).not.toContain(3);
    });

    it('底部一直在可视区域时，连续加载直到最后一页（内容不足一屏的情况）', async () => {
      const api = mockApi({ '/bookList_001': pagedBookList([[orwell], [hobbit], [farm], [gatsby]]) });
      await openList('001');

      scrollToBottom();

      // 要连续加载 4 页，而每加载一页 SWR 都会先重新请求第 1 页，全量并行跑测试时可能超过默认的 5 秒
      await waitFor(() => expect(bookNames()).toEqual(['1984', 'The Hobbit', 'Animal Farm', 'The Great Gatsby']), {
        timeout: 10000,
      });
      expect(Math.max(...pageRequests(api))).toBe(4);
      expect(pageRequests(api)).not.toContain(5);
    });

    it('下一页还在加载时，不会重复请求同一页', async () => {
      const pending: Array<() => void> = [];
      const pages = pagedBookList([[orwell], [hobbit], [farm]]);
      const api = mockApi({
        '/bookList_001': (req: MockRequest) =>
          req.query.pageIndex === '1'
            ? pages(req)
            : new Promise((resolve) => pending.push(() => resolve(pages(req)))),
      });
      await openList('001');

      scrollToBottom();
      await waitFor(() => expect(pending).toHaveLength(1));
      scrollAway();
      scrollToBottom();
      scrollAway();
      scrollToBottom();
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)));

      expect(pageRequests(api).filter((page) => page === 2)).toHaveLength(1);
    });
  });

  describe('请求状态', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('第一页加载中显示加载动画', async () => {
      let resolve!: (value: unknown) => void;
      mockApi({ '/bookList_001': () => new Promise((res) => (resolve = res)) });

      renderApp('/book-list/001');

      await waitFor(() => expect(resolve).toBeDefined());
      expect(document.querySelector('.ygm-spinner-loading')).not.toBeNull();
      expect(screen.queryByText('Mystery & Thriller')).toBeNull();

      await act(async () => resolve({ bookList: [orwell], isLast: true }));
      expect(await screen.findByText('Mystery & Thriller')).toBeTruthy();
    });

    it.each([
      ['接口报错', httpError(500)],
      ['断网', networkError()],
    ])('第一页%s时显示错误页', async (_label, failure) => {
      mockApi({ '/bookList_001': failure });

      renderApp('/book-list/001');

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());
    });

    describe('加载下一页失败', () => {
      const retryButton = () => screen.queryByText('Failed to load. Tap to retry');

      // 第 2 页是否失败由 failPage2 控制，用来模拟“先失败、重试后成功”
      const setup = async () => {
        const state = { failPage2: true };
        const pages = pagedBookList([[orwell, hobbit], [farm]]);
        const api = mockApi({
          '/bookList_001': (req: MockRequest) =>
            req.query.pageIndex === '2' && state.failPage2 ? httpError(500) : pages(req),
        });
        await openList('001');
        scrollToBottom();
        await waitFor(() => expect(retryButton()).not.toBeNull());
        return { api, state };
      };

      it('保留已显示的书和标题，不整页报错', async () => {
        await setup();

        expect(bookNames()).toEqual(['1984', 'The Hobbit']);
        expect(screen.getByText('Mystery & Thriller')).toBeTruthy();
        expect(document.querySelector('.ygm-error-block')).toBeNull();
      });

      it('底部显示重试提示，不再显示加载动画', async () => {
        await setup();

        expect(retryButton()).not.toBeNull();
        expect(bottomSpinner()).toBeFalsy();
      });

      it('底部仍在可视区域时，不会自动反复重试', async () => {
        const { api } = await setup();
        const requestsAfterFailure = pageRequests(api).length;

        scrollAway();
        scrollToBottom();
        await act(() => new Promise((resolve) => setTimeout(resolve, 200)));

        expect(pageRequests(api)).toHaveLength(requestsAfterFailure);
      });

      it('点重试成功后，追加下一页，重试提示消失', async () => {
        const { state } = await setup();
        state.failPage2 = false;

        fireEvent.click(retryButton()!);

        await waitFor(() => expect(bookNames()).toEqual(['1984', 'The Hobbit', 'Animal Farm']));
        expect(retryButton()).toBeNull();
      });

      it('重试仍然失败时，继续显示重试提示，已显示的书不受影响', async () => {
        const { api } = await setup();
        const requestsBefore = pageRequests(api).filter((page) => page === 2).length;

        fireEvent.click(retryButton()!);

        await waitFor(() =>
          expect(pageRequests(api).filter((page) => page === 2).length).toBeGreaterThan(requestsBefore),
        );
        await waitFor(() => expect(retryButton()).not.toBeNull());
        expect(bookNames()).toEqual(['1984', 'The Hobbit']);
      });
    });

    it('不存在的书单 key 显示错误页', async () => {
      mockApi();

      renderApp('/book-list/not-exist');

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());
    });
  });

  describe('页面跳转', () => {
    it('点书进入详情页', async () => {
      mockApi();
      await openList('001');

      fireEvent.click(screen.getByText('The Hobbit'));

      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-2');
    });

    it('从分类页进入，标题对应所选分类，点 Back 返回分类页', async () => {
      mockApi();
      renderApp('/category');
      fireEvent.click(await screen.findByText('Science & Fantasy'));

      expect(await screen.findByText('The Great Gatsby')).toBeTruthy();
      expect(currentUrl()).toBe('/book-list/002');

      fireEvent.click(screen.getByText('Back'));

      expect(await screen.findByText('Mystery & Thriller')).toBeTruthy();
      expect(currentUrl()).toBe('/category');
    });

    it('从详情页返回后，已加载的列表还在', async () => {
      mockApi();
      await openList('001');
      scrollToBottom();
      await waitFor(() => expect(bookNames()).toHaveLength(3));

      fireEvent.click(screen.getByText('Animal Farm'));
      await screen.findByText('Add to bookshelf');
      fireEvent.click(screen.getByText('Back'));

      await waitFor(() => expect(bookNames()).toEqual(['1984', 'The Hobbit', 'Animal Farm']));
    });
  });
});
