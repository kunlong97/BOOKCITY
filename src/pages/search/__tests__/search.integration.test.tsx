import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import {
  books,
  currentUrl,
  httpError,
  mockApi,
  MockRequest,
  readSearchHistory,
  renderApp,
  seedSearchHistory,
} from '@/test-utils';

const PLACEHOLDER = 'Search books or authors';
const DEBOUNCE_MS = 300;

const findInput = () => screen.findByPlaceholderText(PLACEHOLDER) as Promise<HTMLInputElement>;

const type = (input: HTMLInputElement, value: string) => fireEvent.change(input, { target: { value } });
const pressEnter = (input: HTMLInputElement) => fireEvent.keyDown(input, { key: 'Enter' });

// 等到防抖一定已经触发
const waitDebounce = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, DEBOUNCE_MS + 100)));

// 书名可能同时出现在热搜和结果里，简介只有搜索结果才有
const resultOf = (title: string) => `Description of ${title}`;

// 区块隐藏时只是加了 CSS 类名，DOM 还在
const isHidden = (text: string, section: string) =>
  screen.getByText(text).closest(`.${section}`)?.classList.contains('hidden');
const hotHidden = () => isHidden('Trending Searches', 'searchHot');
const historyHidden = () => isHidden('Search History', 'searchHistory');

const clearButton = () => document.querySelector('.ygm-input-clear') as HTMLElement;
const historyItems = () => Array.from(document.querySelectorAll('.listItem .name')).map((el) => el.textContent);

// 打开搜索页，等热搜加载完成
const openSearch = async (url = '/search') => {
  const result = renderApp(url);
  await screen.findByText('The Hobbit');
  return { ...result, input: await findInput() };
};

describe('搜索流程', () => {
  describe('初始状态', () => {
    it('显示热搜和搜索历史，不发起搜索', async () => {
      const api = mockApi();
      seedSearchHistory(['Dune', 'Emma']);

      await openSearch();

      expect(screen.getByText('Animal Farm')).toBeTruthy();
      expect(historyItems()).toEqual(['Dune', 'Emma']);
      expect(hotHidden()).toBe(false);
      expect(historyHidden()).toBe(false);
      expect(api.callsTo('/bookList')).toHaveLength(0);
    });

    it('搜索框自动获得焦点', async () => {
      mockApi();

      const { input } = await openSearch();

      expect(document.activeElement).toBe(input);
    });
  });

  describe('输入搜索（防抖）', () => {
    it('防抖结束后发起搜索，同步 URL，显示结果，隐藏热搜和历史', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');

      expect(await screen.findByText(resultOf('The Hobbit'))).toBeTruthy();
      expect(api.callsTo('/bookList')[0].query.q).toBe('Hobbit');
      expect(currentUrl()).toBe('/search?keyword=Hobbit');
      expect(hotHidden()).toBe(true);
      expect(historyHidden()).toBe(true);
    });

    it('连续输入只发一次请求，用最后的关键词', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      type(input, 'H');
      type(input, 'Ho');
      type(input, 'Hob');

      await screen.findByText(resultOf('The Hobbit'));
      expect(api.callsTo('/bookList').map((call) => call.query.q)).toEqual(['Hob']);
    });

    it('输入搜索不写入历史记录', async () => {
      mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      await screen.findByText(resultOf('The Hobbit'));

      expect(readSearchHistory()).toEqual([]);
    });

    it('防抖期间清空输入框，不会发起搜索，回到热搜', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      type(input, '');
      await waitDebounce();

      expect(api.callsTo('/bookList')).toHaveLength(0);
      expect(hotHidden()).toBe(false);
      expect(currentUrl()).toBe('/search');
    });

    it('关键词变化后显示新的结果', async () => {
      mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      await screen.findByText(resultOf('The Hobbit'));

      type(input, 'Gatsby');

      expect(await screen.findByText(resultOf('The Great Gatsby'))).toBeTruthy();
      expect(screen.queryByText(resultOf('The Hobbit'))).toBeNull();
      expect(currentUrl()).toBe('/search?keyword=Gatsby');
    });

    it('先搜的请求后返回时，不会覆盖后搜的结果', async () => {
      const pending: Record<string, () => void> = {};
      mockApi({
        '/bookList': ({ query }: MockRequest) =>
          new Promise((resolve) => {
            pending[query.q] = () => resolve(query.q === 'Hobbit' ? [books.hobbit] : [books.gatsby]);
          }),
      });
      const { input } = await openSearch();

      type(input, 'Hobbit');
      await waitFor(() => expect(pending.Hobbit).toBeDefined());
      type(input, 'Gatsby');
      await waitFor(() => expect(pending.Gatsby).toBeDefined());

      await act(async () => pending.Gatsby());
      await screen.findByText(resultOf('The Great Gatsby'));
      await act(async () => pending.Hobbit());

      expect(screen.getByText(resultOf('The Great Gatsby'))).toBeTruthy();
      expect(screen.queryByText(resultOf('The Hobbit'))).toBeNull();
    });
  });

  describe('回车搜索', () => {
    it('立即搜索，不等防抖，并写入历史', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      pressEnter(input);

      await screen.findByText(resultOf('The Hobbit'));
      expect(currentUrl()).toBe('/search?keyword=Hobbit');
      expect(readSearchHistory()).toEqual(['Hobbit']);
      expect(api.callsTo('/bookList')).toHaveLength(1);
    });

    it('用户输入后马上按回车，防抖定时器应该被取消，不会多发一次请求。', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      pressEnter(input);
      await screen.findByText(resultOf('The Hobbit'));
      await waitDebounce();

      expect(api.callsTo('/bookList')).toHaveLength(1);
    });

    it('输入框为空时不搜索', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      pressEnter(input);
      await waitDebounce();

      expect(api.callsTo('/bookList')).toHaveLength(0);
      expect(readSearchHistory()).toEqual([]);
    });

    it('搜过的词再搜一次，历史里移到最前面，不重复', async () => {
      mockApi();
      seedSearchHistory(['Dune', 'Hobbit']);
      const { input } = await openSearch();

      type(input, 'Hobbit');
      pressEnter(input);
      await screen.findByText(resultOf('The Hobbit'));

      expect(readSearchHistory()).toEqual(['Hobbit', 'Dune']);
    });

    it('搜索后输入框失去焦点（收起手机键盘）', async () => {
      mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      pressEnter(input);

      expect(document.activeElement).not.toBe(input);
    });
  });

  describe('清除按钮', () => {
    it('清空输入框和 URL，回到热搜和历史', async () => {
      mockApi();
      renderApp('/search?keyword=Hobbit');
      await screen.findByText(resultOf('The Hobbit'));
      const input = await findInput();

      fireEvent.click(clearButton());

      expect(input.value).toBe('');
      expect(currentUrl()).toBe('/search');
      await waitFor(() => expect(hotHidden()).toBe(false));
    });

    it('清除输入框关键词后按回车，不会搜索清除前的关键词', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      await screen.findByText(resultOf('The Hobbit'));
      fireEvent.click(clearButton());
      pressEnter(input);
      await waitDebounce();

      expect(api.callsTo('/bookList')).toHaveLength(1);
      expect(readSearchHistory()).toEqual([]);
      expect(currentUrl()).toBe('/search');
    });

    it('防抖期间点清除，不会发起搜索', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      fireEvent.click(clearButton());
      await waitDebounce();

      expect(api.callsTo('/bookList')).toHaveLength(0);
    });
  });

  describe('热门搜索', () => {
    it('点击后填入输入框，写入历史，同步 URL，显示结果', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      fireEvent.click(screen.getByText('Animal Farm'));

      expect(await screen.findByText(resultOf('Animal Farm'))).toBeTruthy();
      expect(input.value).toBe('Animal Farm');
      expect(readSearchHistory()).toEqual(['Animal Farm']);
      expect(currentUrl()).toBe('/search?keyword=Animal Farm');
      expect(api.callsTo('/bookList')[0].query.q).toBe('Animal Farm');
    });

    it('点击后再按回车，搜索的是这个词', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      fireEvent.click(screen.getByText('The Hobbit'));
      await screen.findByText(resultOf('The Hobbit'));
      pressEnter(input);

      expect(currentUrl()).toBe('/search?keyword=The Hobbit');
      expect(api.calls.filter((call) => call.path === '/bookList' && call.query.q !== 'The Hobbit')).toHaveLength(0);
    });

    it('热搜接口失败时不显示热搜区，页面其他部分正常', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApi({ '/searchHot': httpError(500) });

      renderApp('/search');

      expect(await screen.findByText('Search History')).toBeTruthy();
      await waitFor(() => expect(document.querySelector('.ygm-input')).not.toBeNull());
      expect(screen.queryByText('Trending Searches')).toBeNull();

      jest.restoreAllMocks();
    });
  });

  describe('搜索历史', () => {
    it('点击历史记录发起搜索，填入输入框', async () => {
      const api = mockApi();
      seedSearchHistory(['Gatsby']);
      const { input } = await openSearch();

      fireEvent.click(screen.getByText('Gatsby'));

      expect(await screen.findByText(resultOf('The Great Gatsby'))).toBeTruthy();
      expect(input.value).toBe('Gatsby');
      expect(currentUrl()).toBe('/search?keyword=Gatsby');
      expect(api.callsTo('/bookList')[0].query.q).toBe('Gatsby');
    });

    it('删除单条历史，不会触发搜索，其他记录不变', async () => {
      const api = mockApi();
      seedSearchHistory(['Dune', 'Emma']);
      await openSearch();

      fireEvent.click(document.querySelector('[data-name="Dune"]') as HTMLElement);

      await waitFor(() => expect(historyItems()).toEqual(['Emma']));
      expect(readSearchHistory()).toEqual(['Emma']);
      expect(api.callsTo('/bookList')).toHaveLength(0);
    });

    it('清空全部历史', async () => {
      mockApi();
      seedSearchHistory(['Dune', 'Emma']);
      await openSearch();

      fireEvent.click(document.querySelector('.icon-delete') as HTMLElement);

      await waitFor(() => expect(historyItems()).toEqual([]));
      expect(readSearchHistory()).toEqual([]);
    });

    it('回车搜索后，清除输入框关键词回到历史区时能看到新记录', async () => {
      mockApi();
      const { input } = await openSearch();

      type(input, 'Hobbit');
      pressEnter(input);
      await screen.findByText(resultOf('The Hobbit'));
      fireEvent.click(clearButton());

      await waitFor(() => expect(historyItems()).toEqual(['Hobbit']));
    });
  });

  describe('打开带关键词的地址', () => {
    it('直接显示结果，关键词填入输入框，不写入历史', async () => {
      const api = mockApi();

      renderApp('/search?keyword=Hobbit');

      expect(await screen.findByText(resultOf('The Hobbit'))).toBeTruthy();
      expect((await findInput()).value).toBe('Hobbit');
      expect(api.callsTo('/bookList')[0].query.q).toBe('Hobbit');
      expect(readSearchHistory()).toEqual([]);
    });
  });

  describe('请求状态', () => {
    it('搜索失败后清除，能回到热搜和历史', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApi({ '/bookList': httpError(500) });
      const { input } = await openSearch();

      type(input, 'Hobbit');
      pressEnter(input);
      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());

      fireEvent.click(clearButton());

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).toBeNull());
      expect(hotHidden()).toBe(false);

      jest.restoreAllMocks();
    });

    it('没有匹配结果时不显示任何书籍', async () => {
      const api = mockApi();
      const { input } = await openSearch();

      type(input, 'nothing-matches');
      pressEnter(input);

      await waitFor(() => expect(api.callsTo('/bookList')).toHaveLength(1));
      await waitFor(() => expect(document.querySelector('.ygm-spinner-loading')).toBeNull());
      expect(document.querySelector('.searchList .bookName')).toBeNull();
    });
  });

  describe('页面跳转', () => {
    it('点击搜索结果进入详情页', async () => {
      mockApi();
      renderApp('/search?keyword=Hobbit');

      fireEvent.click(await screen.findByText(resultOf('The Hobbit')));

      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-2');
    });

    it('从详情页返回，搜索结果和关键词都还在', async () => {
      mockApi();
      renderApp('/search?keyword=Hobbit');

      fireEvent.click(await screen.findByText(resultOf('The Hobbit')));
      await screen.findByText('Add to bookshelf');
      fireEvent.click(screen.getByText('Back'));

      expect(await screen.findByText(resultOf('The Hobbit'))).toBeTruthy();
      expect((await findInput()).value).toBe('Hobbit');
      expect(currentUrl()).toBe('/search?keyword=Hobbit');
    });

    describe('离开后重新进入', () => {
      // 从首页进入搜索页，搜索，点 Cancel 回到首页
      const searchThenLeave = async (search: (input: HTMLInputElement) => void) => {
        renderApp('/');
        await screen.findByText('Hot Picks');
        fireEvent.click(document.querySelector('.icon-search') as HTMLElement);
        await screen.findByText('Trending Searches');

        search(await findInput());
        await screen.findByText(resultOf('The Hobbit'));

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await screen.findByText('Hot Picks');
      };

      const reopenSearch = async () => {
        fireEvent.click(document.querySelector('.icon-search') as HTMLElement);
        return findInput();
      };

      it('回到初始状态：输入框为空，显示热搜和历史，不显示上次的结果', async () => {
        mockApi();
        await searchThenLeave((input) => {
          type(input, 'Hobbit');
          pressEnter(input);
        });

        const input = await reopenSearch();

        await waitFor(() => expect(input.value).toBe(''));
        await waitFor(() => expect(hotHidden()).toBe(false));
        expect(historyHidden()).toBe(false);
        expect(screen.queryByText(resultOf('The Hobbit'))).toBeNull();
        expect(currentUrl()).toBe('/search');
      });

      it('上次是点热搜搜索的，同样回到初始状态', async () => {
        mockApi();
        await searchThenLeave(() => fireEvent.click(screen.getByText('The Hobbit')));

        const input = await reopenSearch();

        await waitFor(() => expect(hotHidden()).toBe(false));
        expect(input.value).toBe('');
      });

      it('重新进入后，历史里能看到上次回车搜索的词', async () => {
        mockApi();
        await searchThenLeave((input) => {
          type(input, 'Hobbit');
          pressEnter(input);
        });

        await reopenSearch();

        await waitFor(() => expect(historyItems()).toEqual(['Hobbit']));
      });

      it('重新进入后可以正常发起新的搜索', async () => {
        mockApi();
        await searchThenLeave((input) => {
          type(input, 'Hobbit');
          pressEnter(input);
        });

        const input = await reopenSearch();
        await waitFor(() => expect(input.value).toBe(''));
        type(input, 'Gatsby');
        pressEnter(input);

        expect(await screen.findByText(resultOf('The Great Gatsby'))).toBeTruthy();
        expect(currentUrl()).toBe('/search?keyword=Gatsby');
      });
    });

    it('点 Cancel 返回上一页', async () => {
      mockApi();
      renderApp('/');
      await screen.findByText('Hot Picks');
      fireEvent.click(document.querySelector('.icon-search') as HTMLElement);
      await findInput();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(await screen.findByText('Hot Picks')).toBeTruthy();
      expect(currentUrl()).toBe('/');
    });
  });
});
