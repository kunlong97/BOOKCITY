import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  books,
  currentUrl,
  httpError,
  mockApi,
  networkError,
  pagedBookList,
  readSearchHistory,
  readShelf,
  renderApp,
  seedSearchHistory,
  seedShelf,
  setIntersecting,
} from '..';

// 验证公共测试工具本身是可靠的：后面所有集成测试都建立在它上面
describe('renderApp', () => {
  it('渲染真实页面，数据来自模拟接口', async () => {
    const api = mockApi();

    renderApp('/');

    expect(await screen.findByText('Hot Picks')).toBeTruthy();
    expect(screen.getAllByText('1984').length).toBeGreaterThan(0);
    expect(api.callsTo('/headerCarousel')).toHaveLength(1);
  });

  it('支持路由跳转，currentUrl 返回当前地址', async () => {
    mockApi();
    renderApp('/');

    fireEvent.click(await screen.findByText('Genres'));

    expect(await screen.findByText('Mystery & Thriller')).toBeTruthy();
    expect(currentUrl()).toBe('/category');
  });

  it('不存在的路由跳转回首页', async () => {
    mockApi();
    renderApp('/not-exist');

    expect(await screen.findByText('Hot Picks')).toBeTruthy();
    expect(currentUrl()).toBe('/');
  });

  it('打开带查询参数的地址时，页面能从 window.location 读到', async () => {
    const api = mockApi();
    renderApp('/search?keyword=Hobbit');

    // 热搜词隐藏时只是加了 CSS 类名，DOM 里还在，所以用只有结果里才有的简介来断言
    expect(await screen.findByText('Description of The Hobbit')).toBeTruthy();
    expect(api.callsTo('/bookList')[0].query.q).toBe('Hobbit');
  });

  it('preloadedState 设置 Redux 初始状态', async () => {
    mockApi();
    seedShelf([books.orwell]);

    renderApp('/shelf', {
      preloadedState: { Shelf: { editMode: true, selectedBook: [], selectedGroup: [], groupVisibleMode: false } },
    });

    expect(await screen.findByText('Finish')).toBeTruthy();
  });
});

describe('mockApi', () => {
  beforeEach(() => {
    // 请求失败时 axiosInstance 会输出错误日志
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('httpError 模拟接口失败，页面走到错误状态', async () => {
    mockApi({ '/category': httpError(500) });

    const { container } = renderApp('/category');

    await waitFor(() => expect(container.querySelector('.ygm-error-block')).not.toBeNull());
  });

  it('networkError 模拟断网', async () => {
    mockApi({ '/headerCarousel': networkError() });

    const { container } = renderApp('/');

    await waitFor(() => expect(container.querySelector('.ygm-error-block')).not.toBeNull());
  });

  it('没有配置的接口返回 404', async () => {
    mockApi();

    const { container } = renderApp('/book-list/not-exist');

    await waitFor(() => expect(container.querySelector('.ygm-error-block')).not.toBeNull());
  });

  it('过滤查询查不到时返回空数组，和 json-server 一致', async () => {
    const api = mockApi();
    renderApp('/search?keyword=nothing-matches');

    await waitFor(() => expect(api.callsTo('/bookList')).toHaveLength(1));
    expect(screen.queryByText('1984')).toBeNull();
  });

  it('函数形式的接口可以返回 Promise，用来控制请求何时完成', async () => {
    let resolve!: (value: unknown) => void;
    mockApi({ '/category': () => new Promise((res) => (resolve = res)) });

    const { container } = renderApp('/category');

    await waitFor(() => expect(resolve).toBeDefined());
    expect(screen.queryByText('Category')).toBeNull();

    resolve([{ id: '009', name: 'Poetry', bookCount: 1, bookCover: '' }]);

    expect(await screen.findByText('Poetry')).toBeTruthy();
    expect(container.querySelector('.ygm-error-block')).toBeNull();
  });

  it('pagedBookList 按页码返回数据，最后一页 isLast 为 true', async () => {
    mockApi({ '/bookList_001': pagedBookList([[books.gatsby]]) });

    renderApp('/book-list/001');

    expect(await screen.findByText('The Great Gatsby')).toBeTruthy();
    expect(screen.queryByText('1984')).toBeNull();
  });

  it('use 可以中途修改接口', async () => {
    const api = mockApi();
    api.use({ '/category': [{ id: '009', name: 'Poetry', bookCount: 1, bookCover: '' }] });

    renderApp('/category');

    expect(await screen.findByText('Poetry')).toBeTruthy();
  });
});

describe('setIntersecting', () => {
  it('让懒加载的封面图片加载出来', async () => {
    mockApi();
    renderApp('/category');

    const cover = (await screen.findByAltText('Mystery & Thriller')) as HTMLImageElement;
    expect(cover.getAttribute('src')).not.toBe('/images/category1.png');

    setIntersecting(true, cover);

    expect(cover.getAttribute('src')).toBe('/images/category1.png');
  });
});

describe('用例之间互相隔离', () => {
  it('第一个用例：写入各种状态', async () => {
    const api = mockApi();
    seedShelf([books.orwell]);
    seedSearchHistory(['abc']);
    renderApp('/book/book-1');

    fireEvent.click(await screen.findByText('Add to bookshelf'));

    expect(await screen.findByText('Removed from the bookshelf')).toBeTruthy();
    expect(api.callsTo('/book')).toHaveLength(1);
  });

  it('第二个用例：localStorage、地址、Toast 和接口缓存都恢复了', async () => {
    expect(readShelf()).toEqual([]);
    expect(readSearchHistory()).toEqual([]);
    expect(currentUrl()).toBe('/');
    expect(document.querySelector('.ygm-toast')).toBeNull();

    // 缓存是新的：同一本书会重新发请求
    const api = mockApi();
    renderApp('/book/book-1');

    expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
    expect(api.callsTo('/book')).toHaveLength(1);
  });
});
