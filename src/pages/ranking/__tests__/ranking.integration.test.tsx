import { fireEvent, screen, waitFor } from '@testing-library/react';
import { books, currentUrl, httpError, mockApi, networkError, renderApp } from '@/test-utils';

const { orwell, gatsby } = books;

// 侧边栏的榜单名
const sidebarTitles = () =>
  Array.from(document.querySelectorAll('.ygm-sidebar-item-title')).map((el) => el.textContent);
const activeTitle = () => document.querySelector('.ygm-sidebar-item-active')?.textContent;
const clickSidebar = (title: string) =>
  fireEvent.click(
    Array.from(document.querySelectorAll('.ygm-sidebar-item-title')).find((el) => el.textContent === title)!,
  );

// 当前显示的榜单里的书（未选中的榜单也会渲染，只是 display: none）
const visibleBookNames = () =>
  Array.from(document.querySelectorAll('.ygm-sidebar-content-item'))
    .filter((el) => (el as HTMLElement).style.display === 'block')
    .flatMap((el) => Array.from(el.querySelectorAll('.bookName')).map((name) => name.textContent));

const openRanking = async () => {
  const result = renderApp('/ranking');
  await screen.findByText('Popular List');
  await waitFor(() => expect(visibleBookNames().length).toBeGreaterThan(0));
  return result;
};

describe('排行榜', () => {
  describe('展示', () => {
    it('显示页面标题和所有榜单', async () => {
      mockApi();
      await openRanking();

      expect(screen.getByText('Rankings')).toBeTruthy();
      expect(sidebarTitles()).toEqual(['Popular List', 'Bestseller list']);
    });

    it('默认选中第一个榜单，显示它的书', async () => {
      mockApi();
      await openRanking();

      expect(activeTitle()).toBe('Popular List');
      expect(visibleBookNames()).toEqual(['1984', 'The Hobbit']);
      expect(screen.getByText('George Orwell·Dystopian Fiction')).toBeTruthy();
    });

    it('按榜单的 key 请求对应的书', async () => {
      const api = mockApi();
      await openRanking();

      expect(api.callsTo('/ranking')).toHaveLength(1);
      expect(api.callsTo('/rank_001')).toHaveLength(1);
    });
  });

  describe('切换榜单', () => {
    it('点击其他榜单，切换选中状态并显示对应的书', async () => {
      mockApi();
      await openRanking();

      clickSidebar('Bestseller list');

      expect(activeTitle()).toBe('Bestseller list');
      await waitFor(() => expect(visibleBookNames()).toEqual(['The Great Gatsby']));
    });

    it('切换回来时，之前的书还在，不需要重新请求', async () => {
      const api = mockApi();
      await openRanking();

      clickSidebar('Bestseller list');
      await waitFor(() => expect(visibleBookNames()).toEqual(['The Great Gatsby']));
      const requestsBefore = api.callsTo('/rank_001').length;
      clickSidebar('Popular List');

      expect(visibleBookNames()).toEqual(['1984', 'The Hobbit']);
      expect(api.callsTo('/rank_001')).toHaveLength(requestsBefore);
    });

    it('点击当前已选中的榜单，保持不变', async () => {
      mockApi();
      await openRanking();

      clickSidebar('Popular List');

      expect(activeTitle()).toBe('Popular List');
      expect(visibleBookNames()).toEqual(['1984', 'The Hobbit']);
    });
  });

  describe('选中的榜单记在 URL 里', () => {
    it('切换榜单时更新 URL 的 key', async () => {
      mockApi();
      await openRanking();

      clickSidebar('Bestseller list');

      expect(currentUrl()).toBe('/ranking?key=002');
    });

    it('打开带 key 的地址，直接选中对应的榜单', async () => {
      mockApi();

      renderApp('/ranking?key=002');

      await screen.findByText('Popular List');
      expect(activeTitle()).toBe('Bestseller list');
      await waitFor(() => expect(visibleBookNames()).toEqual(['The Great Gatsby']));
    });

    it('key 不存在时默认选中第一个榜单', async () => {
      mockApi();

      renderApp('/ranking?key=999');

      await screen.findByText('Popular List');
      expect(activeTitle()).toBe('Popular List');
    });

    it('从详情页返回后，仍然是之前选中的榜单', async () => {
      mockApi();
      await openRanking();
      clickSidebar('Bestseller list');
      await waitFor(() => expect(visibleBookNames()).toEqual(['The Great Gatsby']));

      fireEvent.click(screen.getByText('The Great Gatsby'));
      await screen.findByText('Add to bookshelf');
      fireEvent.click(screen.getByText('Back'));

      await screen.findByText('Popular List');
      expect(activeTitle()).toBe('Bestseller list');
      expect(currentUrl()).toBe('/ranking?key=002');
    });

    it('切换榜单不会在浏览器历史里留下记录，返回直接回到上一个页面', async () => {
      mockApi();
      renderApp('/');
      fireEvent.click(await screen.findByText('Rankings'));
      await screen.findByText('Popular List');

      clickSidebar('Bestseller list');
      clickSidebar('Popular List');
      clickSidebar('Bestseller list');
      fireEvent.click(screen.getByText('Back'));

      expect(await screen.findByText('Hot Picks')).toBeTruthy();
      expect(currentUrl()).toBe('/');
    });
  });

  describe('页面跳转', () => {
    it('点书进入详情页', async () => {
      mockApi();
      await openRanking();

      fireEvent.click(screen.getByText('The Hobbit'));

      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-2');
    });

    it('切换榜单后点书，进入对应的详情页', async () => {
      mockApi();
      await openRanking();
      clickSidebar('Bestseller list');
      await waitFor(() => expect(visibleBookNames()).toEqual(['The Great Gatsby']));

      fireEvent.click(screen.getByText('The Great Gatsby'));

      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
      expect(currentUrl()).toBe(`/book/${gatsby.bookId}`);
    });

    it('从首页进入，点 Back 回到首页', async () => {
      mockApi();
      renderApp('/');
      fireEvent.click(await screen.findByText('Rankings'));
      await screen.findByText('Popular List');

      fireEvent.click(screen.getByText('Back'));

      expect(await screen.findByText('Hot Picks')).toBeTruthy();
      expect(currentUrl()).toBe('/');
    });

    it('从详情页返回，回到排行榜', async () => {
      mockApi();
      await openRanking();
      fireEvent.click(screen.getByText(orwell.title));
      await screen.findByText('Add to bookshelf');

      fireEvent.click(screen.getByText('Back'));

      expect(await screen.findByText('Popular List')).toBeTruthy();
      expect(currentUrl()).toBe('/ranking');
    });
  });

  describe('请求状态', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('榜单列表加载中显示加载动画', async () => {
      let resolve!: (value: unknown) => void;
      mockApi({ '/ranking': () => new Promise((res) => (resolve = res)) });

      renderApp('/ranking');

      await waitFor(() => expect(resolve).toBeDefined());
      expect(document.querySelector('.ygm-spinner-loading')).not.toBeNull();
      expect(screen.queryByText('Rankings')).toBeNull();

      resolve([{ id: 1, key: '001', title: '最热榜', cover: '', shortTitle: 'Popular List' }]);

      expect(await screen.findByText('Popular List')).toBeTruthy();
    });

    it.each([
      ['接口报错', httpError(500)],
      ['断网', networkError()],
    ])('榜单列表%s时显示错误页', async (_label, failure) => {
      mockApi({ '/ranking': failure });

      renderApp('/ranking');

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());
      expect(screen.queryByText('Popular List')).toBeNull();
    });

    it('榜单列表为空时显示提示，保留顶部导航，页面不崩溃', async () => {
      mockApi({ '/ranking': [] });

      renderApp('/ranking');

      expect(await screen.findByText('No rankings available')).toBeTruthy();
      expect(screen.getByText('Rankings')).toBeTruthy();
      expect(screen.queryByText('Back to Homepage')).toBeNull();
    });

    describe('当前榜单的书', () => {
      const visibleItem = () =>
        Array.from(document.querySelectorAll('.ygm-sidebar-content-item')).find(
          (el) => (el as HTMLElement).style.display === 'block',
        ) as HTMLElement;
      const retryButton = () => screen.queryByText('Failed to load. Tap to retry');

      it('加载中显示加载动画', async () => {
        let resolve!: (value: unknown) => void;
        mockApi({ '/rank_001': () => new Promise((res) => (resolve = res)) });

        renderApp('/ranking');
        await screen.findByText('Popular List');

        expect(visibleItem().querySelector('.ygm-spinner-loading')).not.toBeNull();

        resolve([orwell]);
        await waitFor(() => expect(visibleBookNames()).toEqual(['1984']));
        expect(visibleItem().querySelector('.ygm-spinner-loading')).toBeNull();
      });

      it('加载失败时显示重试提示，不是一片空白', async () => {
        mockApi({ '/rank_001': httpError(500) });

        renderApp('/ranking');
        await screen.findByText('Popular List');

        await waitFor(() => expect(retryButton()).not.toBeNull());
        expect(visibleItem().contains(retryButton())).toBe(true);
      });

      it('点重试重新请求，成功后显示书', async () => {
        const state = { fail: true };
        const api = mockApi({ '/rank_001': () => (state.fail ? httpError(500) : [orwell]) });
        renderApp('/ranking');
        await waitFor(() => expect(retryButton()).not.toBeNull());
        state.fail = false;

        fireEvent.click(retryButton()!);

        await waitFor(() => expect(visibleBookNames()).toEqual(['1984']));
        expect(retryButton()).toBeNull();
        expect(api.callsTo('/rank_001')).toHaveLength(2);
      });
    });

    it('某个榜单的书加载失败时，其他榜单不受影响', async () => {
      mockApi({ '/rank_002': httpError(500) });
      await openRanking();

      expect(visibleBookNames()).toEqual(['1984', 'The Hobbit']);
      expect(document.querySelector('.ygm-error-block')).toBeNull();
    });
  });
});
