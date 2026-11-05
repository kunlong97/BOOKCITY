import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { books, categories, currentUrl, homeData, httpError, mockApi, networkError, renderApp } from '@/test-utils';

const { orwell, hobbit, farm, gatsby } = books;

// 首页各模块（同一本书可能出现在多个模块里，断言时限定在模块内部）
const section = (name: 'popular' | 'recommend' | 'limited' | 'ranking') =>
  document.querySelector(`.${name}`) as HTMLElement;
const namesIn = (el: HTMLElement) => Array.from(el.querySelectorAll('.bookName')).map((n) => n.textContent);
const moreOf = (name: 'popular' | 'recommend' | 'ranking') => within(section(name)).getByText('More');

// 首页“排行”模块里当前显示的 tab 的书
const visibleRankingBooks = () =>
  Array.from(section('ranking').querySelectorAll('.ygm-tabs-content'))
    .filter((el) => (el as HTMLElement).style.display === 'block')
    .flatMap((el) => namesIn(el as HTMLElement));

const openHome = async () => {
  const result = renderApp('/');
  await screen.findByText('Hot Picks');
  return result;
};

describe('首页', () => {
  describe('展示', () => {
    it('只请求一次首页数据，各模块共用', async () => {
      const api = mockApi();
      await openHome();

      expect(api.callsTo('/headerCarousel')).toHaveLength(1);
    });

    it('显示站点名和顶部的搜索、书架入口', async () => {
      mockApi();
      await openHome();

      expect(screen.getByText('MoocReads')).toBeTruthy();
      expect(document.querySelector('.icon-search')).not.toBeNull();
      expect(document.querySelector('.icon-shelf')).not.toBeNull();
    });

    it('轮播图按数据显示每一张', async () => {
      mockApi();
      await openHome();

      const images = Array.from(document.querySelectorAll('.ygm-swiper-item img')) as HTMLImageElement[];
      expect(images.map((img) => img.alt)).toEqual(homeData.banner.map((item) => item.alt));
      expect(document.querySelectorAll('.ygm-swiper-page-indicator-dot')).toHaveLength(homeData.banner.length);
    });

    it('显示四个分类入口', async () => {
      mockApi();
      await openHome();

      ['Rankings', 'Genres', 'Completed', 'Picks'].forEach((text) => expect(screen.getByText(text)).toBeTruthy());
    });

    it('Hot Picks 显示书名、简介、作者和分类', async () => {
      mockApi();
      await openHome();

      expect(namesIn(section('popular'))).toEqual([orwell.title, hobbit.title]);
      expect(within(section('popular')).getByText('Description of 1984')).toBeTruthy();
      expect(within(section('popular')).getByText('George Orwell·Dystopian Fiction')).toBeTruthy();
    });

    it("Today's Picks 显示书名和作者", async () => {
      mockApi();
      await openHome();

      expect(within(section('recommend')).getByText("Today's Picks")).toBeTruthy();
      expect(namesIn(section('recommend'))).toEqual([gatsby.title, farm.title]);
    });

    it('限时免费模块显示倒计时和书', async () => {
      mockApi();
      await openHome();

      expect(within(section('limited')).getByText('Free for a limited time')).toBeTruthy();
      expect(namesIn(section('limited'))).toEqual([farm.title]);
      // 倒计时 3 小时，格式 hh:mm:ss
      expect(section('limited').querySelector('.ygm-countdown')?.textContent).toMatch(/^0[23]:\d\d:\d\d$/);
    });

    it('排行模块显示所有榜单标题，默认显示第一个榜单的书', async () => {
      mockApi();
      await openHome();

      const tabTitles = Array.from(section('ranking').querySelectorAll('.ygm-tabs-tab-title')).map(
        (el) => el.textContent,
      );
      expect(tabTitles).toEqual(['Top Rated', 'Most Read']);
      expect(visibleRankingBooks()).toEqual([gatsby.title]);
    });
  });

  describe('交互', () => {
    it('排行模块切换榜单，显示对应的书', async () => {
      mockApi();
      await openHome();

      fireEvent.click(within(section('ranking')).getByText('Most Read'));

      expect(visibleRankingBooks()).toEqual([hobbit.title]);
    });

    it.each([
      ['popular', orwell.title, orwell.bookId],
      ['recommend', gatsby.title, gatsby.bookId],
      ['limited', farm.title, farm.bookId],
      ['ranking', gatsby.title, gatsby.bookId],
    ] as const)('点 %s 模块里的书进入详情页', async (name, title, bookId) => {
      mockApi();
      await openHome();

      fireEvent.click(within(section(name)).getByText(title));

      expect(await screen.findByText('Add to bookshelf')).toBeTruthy();
      expect(currentUrl()).toBe(`/book/${bookId}`);
    });
  });

  describe('跳转入口', () => {
    it.each([
      ['popular', '/book-list/hotpicks', 'Hot Picks'],
      ['recommend', '/book-list/todaypicks', "Today's Picks"],
    ] as const)('%s 模块的 More 进入对应书单', async (name, url, title) => {
      mockApi();
      await openHome();

      fireEvent.click(moreOf(name));

      await waitFor(() => expect(currentUrl()).toBe(url));
      expect(await screen.findByText(title, { selector: '.ygm-nav-bar-title' })).toBeTruthy();
      expect(document.querySelector('.ygm-error-block')).toBeNull();
    });

    it('排行模块的 More 进入排行榜', async () => {
      mockApi();
      await openHome();

      fireEvent.click(moreOf('ranking'));

      expect(await screen.findByText('Popular List')).toBeTruthy();
      expect(currentUrl()).toBe('/ranking');
    });

    it.each([
      ['Rankings', '/ranking', 'Popular List'],
      ['Genres', '/category', 'Mystery & Thriller'],
      ['Completed', '/book-list/finish', 'Animal Farm'],
      ['Picks', '/book-list/recommend', 'The Great Gatsby'],
    ])('分类入口 %s 进入 %s', async (text, url, expected) => {
      mockApi();
      await openHome();

      fireEvent.click(screen.getByText(text));

      expect(await screen.findByText(expected)).toBeTruthy();
      expect(currentUrl()).toBe(url);
    });

    it.each([
      ['icon-search', '/search', 'Search History'],
      ['icon-shelf', '/shelf', 'My Bookshelf'],
    ])('顶部图标 %s 进入 %s', async (icon, url, expected) => {
      mockApi();
      await openHome();

      fireEvent.click(document.querySelector(`.${icon}`) as HTMLElement);

      expect(await screen.findByText(expected)).toBeTruthy();
      expect(currentUrl()).toBe(url);
    });

    it('从详情页返回首页，不会重新请求首页数据', async () => {
      const api = mockApi();
      await openHome();
      fireEvent.click(within(section('popular')).getByText(orwell.title));
      await screen.findByText('Add to bookshelf');

      fireEvent.click(screen.getByText('Back'));

      expect(await screen.findByText('Hot Picks')).toBeTruthy();
      expect(api.callsTo('/headerCarousel')).toHaveLength(1);
    });
  });

  describe('请求状态', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('加载中显示加载动画，完成后显示内容', async () => {
      let resolve!: (value: unknown) => void;
      mockApi({ '/headerCarousel': () => new Promise((res) => (resolve = res)) });

      renderApp('/');

      await waitFor(() => expect(resolve).toBeDefined());
      expect(document.querySelector('.ygm-spinner-loading')).not.toBeNull();
      expect(screen.queryByText('Hot Picks')).toBeNull();

      await act(async () => resolve(homeData));
      expect(await screen.findByText('Hot Picks')).toBeTruthy();
    });

    describe('首页数据缺少某个模块', () => {
      const modules = [
        ['banner', () => document.querySelector('.ygm-swiper')],
        ['popular', () => section('popular')],
        ['recommend', () => section('recommend')],
        ['limited', () => section('limited')],
        ['ranking', () => section('ranking')],
      ] as const;

      it.each(modules)('缺少 %s 时只隐藏这个模块，其他模块正常显示', async (field, find) => {
        const { [field]: _omit, ...rest } = homeData;
        mockApi({ '/headerCarousel': rest });

        renderApp('/');

        expect(await screen.findByText('MoocReads')).toBeTruthy();
        expect(find()).toBeNull();
        modules.filter(([other]) => other !== field).forEach(([, findOther]) => expect(findOther()).not.toBeNull());
        expect(screen.queryByText('Back to Homepage')).toBeNull();
      });

      it.each(modules)('%s 为空数组时同样隐藏这个模块', async (field, find) => {
        mockApi({ '/headerCarousel': { ...homeData, [field]: [] } });

        renderApp('/');

        expect(await screen.findByText('MoocReads')).toBeTruthy();
        expect(find()).toBeNull();
      });

      it('所有模块都没有数据时，仍显示顶部和分类入口', async () => {
        mockApi({ '/headerCarousel': {} });

        renderApp('/');

        expect(await screen.findByText('MoocReads')).toBeTruthy();
        expect(screen.getByText('Genres')).toBeTruthy();
        expect(screen.queryByText('Back to Homepage')).toBeNull();
      });
    });

    it.each([
      ['接口报错', httpError(500)],
      ['断网', networkError()],
    ])('首页数据%s时显示错误页', async (_label, failure) => {
      mockApi({ '/headerCarousel': failure });

      renderApp('/');

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());
      expect(screen.queryByText('Hot Picks')).toBeNull();
    });
  });
});

describe('分类页', () => {
  const categoryNames = () => Array.from(document.querySelectorAll('.categoryItem .name')).map((el) => el.textContent);

  const openCategory = async () => {
    const result = renderApp('/category');
    await screen.findByText('Mystery & Thriller');
    return result;
  };

  it('显示标题和所有分类的名称、书籍数量', async () => {
    const api = mockApi();
    await openCategory();

    expect(screen.getByText('Category')).toBeTruthy();
    expect(categoryNames()).toEqual(categories.map((item) => item.name));
    expect(screen.getByText('239')).toBeTruthy();
    expect(screen.getByText('472')).toBeTruthy();
    expect(api.callsTo('/category')).toHaveLength(1);
  });

  it('点分类进入对应书单，标题是分类名', async () => {
    mockApi();
    await openCategory();

    fireEvent.click(screen.getByText('Science & Fantasy'));

    expect(await screen.findByText('Science & Fantasy', { selector: '.ygm-nav-bar-title' })).toBeTruthy();
    expect(currentUrl()).toBe('/book-list/002');
  });

  describe('接口新增了前端没有登记的分类', () => {
    const poetry = { id: '007', name: 'Poetry', bookCount: 3, bookCover: '' };

    it('点进去能正常显示书单，标题是分类名', async () => {
      mockApi({
        '/category': [...categories, poetry],
        '/bookList_007': { bookList: [gatsby], isLast: true },
      });
      await openCategory();

      fireEvent.click(screen.getByText('Poetry'));

      expect(await screen.findByText('Poetry', { selector: '.ygm-nav-bar-title' })).toBeTruthy();
      expect(screen.getByText(gatsby.title)).toBeTruthy();
      expect(document.querySelector('.ygm-error-block')).toBeNull();
      expect(currentUrl()).toBe('/book-list/007');
    });

    it('直接打开这个书单（没有带标题）时，显示通用标题', async () => {
      mockApi({ '/bookList_007': { bookList: [gatsby], isLast: true } });

      renderApp('/book-list/007');

      expect(await screen.findByText('Book List', { selector: '.ygm-nav-bar-title' })).toBeTruthy();
      expect(screen.getByText(gatsby.title)).toBeTruthy();
    });

    it('书单接口不存在时，仍然显示错误页', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApi({ '/category': [...categories, poetry] });
      await openCategory();

      fireEvent.click(screen.getByText('Poetry'));

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());
      jest.restoreAllMocks();
    });
  });

  it('从首页进入，点 Back 回到首页', async () => {
    mockApi();
    renderApp('/');
    fireEvent.click(await screen.findByText('Genres'));
    await screen.findByText('Mystery & Thriller');

    fireEvent.click(screen.getByText('Back'));

    expect(await screen.findByText('Hot Picks')).toBeTruthy();
    expect(currentUrl()).toBe('/');
  });

  describe('请求状态', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('加载中显示加载动画', async () => {
      let resolve!: (value: unknown) => void;
      mockApi({ '/category': () => new Promise((res) => (resolve = res)) });

      renderApp('/category');

      await waitFor(() => expect(resolve).toBeDefined());
      expect(document.querySelector('.ygm-spinner-loading')).not.toBeNull();

      await act(async () => resolve(categories));
      expect(await screen.findByText('Mystery & Thriller')).toBeTruthy();
    });

    it.each([
      ['接口报错', httpError(500)],
      ['断网', networkError()],
    ])('%s时显示错误页', async (_label, failure) => {
      mockApi({ '/category': failure });

      renderApp('/category');

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());
    });
  });
});
