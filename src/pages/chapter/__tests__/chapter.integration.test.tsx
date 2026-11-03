import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { books, currentUrl, httpError, mockApi, networkError, renderApp } from '@/test-utils';
import { NIGHT_THEME, THEME } from '../componets/constants';

const { orwell } = books;

// jsdom 会把颜色规范化成 rgb(...)
const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const openChapter = async (chapter = 2, bookId = 'book-1') => {
  const result = renderApp(`/book/${bookId}/${chapter}`);
  await screen.findByText(`Paragraph one of chapter ${chapter}.`);
  return result;
};

const content = () => document.querySelector('.content') as HTMLElement;
const chapterTitle = () => within(content()).getByRole('heading').textContent;
const clickContent = () => fireEvent.click(content().querySelector('p') as HTMLElement);
const pagination = (text: 'Prev Chapter' | 'Next Chapter') =>
  within(content().querySelector('.pagination') as HTMLElement).getByText(text);

const progressBar = () => document.querySelector('.progress') as HTMLElement;
const progressButton = (text: 'Prev Chapter' | 'Next Chapter') => within(progressBar()).getByText(text);
const progressValue = () => (progressBar().querySelector('.progressVal') as HTMLElement).textContent;

const chapterState = (store: ReturnType<typeof renderApp>['store']) => store.getState().Chapter;

describe('阅读页', () => {
  describe('展示', () => {
    it('显示章节标题和正文', async () => {
      mockApi();
      await openChapter(2);

      expect(chapterTitle()).toBe('Chapter 2 of 1984');
      expect(screen.getByText('Paragraph two of chapter 2.')).toBeTruthy();
    });

    it('按 URL 请求这本书的章节列表和这一章的正文', async () => {
      const api = mockApi();
      await openChapter(3, 'book-2');

      expect(api.callsTo('/chapterInfoDetail')[0].query.bookId).toBe('book-2');
      expect(api.callsTo('/chapterContent')[0].query.chapterId).toBe('3');
      expect(chapterTitle()).toBe('Chapter 3 of The Hobbit');
    });

    it('默认隐藏顶部和底部栏，使用默认主题和 18 号字', async () => {
      mockApi();
      const { store } = await openChapter();

      expect(chapterState(store)).toMatchObject({ headerVisible: false, footerVisible: false, nightTheme: false });
      expect(content().style.backgroundColor).toBe(toRgb(THEME[0]));
      expect(content().style.fontSize).toBe('18px');
    });
  });

  describe('点击正文', () => {
    it('显示顶部和底部栏，再点一次隐藏', async () => {
      mockApi();
      const { store } = await openChapter();

      clickContent();
      expect(chapterState(store)).toMatchObject({ headerVisible: true, footerVisible: true });

      clickContent();
      expect(chapterState(store)).toMatchObject({ headerVisible: false, footerVisible: false });
    });

    it('同时关闭已打开的进度条和设置面板', async () => {
      mockApi();
      const { store } = await openChapter();
      clickContent();
      fireEvent.click(screen.getByText('Progress'));
      fireEvent.click(screen.getByText('Settings'));

      clickContent();

      expect(chapterState(store)).toMatchObject({ footerProgressBarVisible: false, footerSettingBarVisible: false });
    });
  });

  describe('正文底部的上一章 / 下一章', () => {
    it('上一章：跳转到前一章并显示内容', async () => {
      mockApi();
      await openChapter(3);

      fireEvent.click(pagination('Prev Chapter'));

      expect(await screen.findByText('Paragraph one of chapter 2.')).toBeTruthy();
      expect(chapterTitle()).toBe('Chapter 2 of 1984');
      expect(currentUrl()).toBe('/book/book-1/2');
    });

    it('上一章：同时隐藏顶部和底部栏', async () => {
      mockApi();
      const { store } = await openChapter(3);
      clickContent();

      fireEvent.click(pagination('Prev Chapter'));

      expect(chapterState(store)).toMatchObject({ headerVisible: false, footerVisible: false });
    });

    it('第一章点上一章不跳转', async () => {
      mockApi();
      await openChapter(1);

      fireEvent.click(pagination('Prev Chapter'));

      expect(currentUrl()).toBe('/book/book-1/1');
      expect(chapterTitle()).toBe('Chapter 1 of 1984');
    });

    it('下一章：跳转到后一章并显示内容', async () => {
      mockApi();
      await openChapter(2);

      fireEvent.click(pagination('Next Chapter'));

      expect(await screen.findByText('Paragraph one of chapter 3.')).toBeTruthy();
      expect(chapterTitle()).toBe('Chapter 3 of 1984');
      expect(currentUrl()).toBe('/book/book-1/3');
    });

    it('下一章：栏隐藏时点击，跳转后栏仍然隐藏', async () => {
      mockApi();
      const { store } = await openChapter(2);

      fireEvent.click(pagination('Next Chapter'));
      await screen.findByText('Paragraph one of chapter 3.');

      expect(chapterState(store)).toMatchObject({ headerVisible: false, footerVisible: false });
    });

    it('下一章：栏显示时点击，跳转后隐藏栏（和上一章一致）', async () => {
      mockApi();
      const { store } = await openChapter(2);
      clickContent();

      fireEvent.click(pagination('Next Chapter'));
      await screen.findByText('Paragraph one of chapter 3.');

      expect(chapterState(store)).toMatchObject({ headerVisible: false, footerVisible: false });
    });

    it('最后一章点下一章不跳转', async () => {
      mockApi();
      await openChapter(5);

      fireEvent.click(pagination('Next Chapter'));

      expect(currentUrl()).toBe('/book/book-1/5');
      expect(chapterTitle()).toBe('Chapter 5 of 1984');
    });

    it('翻页用 replace 模式来更新路由，避免在浏览器历史记录中堆积大量的章节 URL', async () => {
      mockApi();
      renderApp('/book/book-1');
      fireEvent.click(await screen.findByText('Start Reading'));
      await screen.findByText('Paragraph one of chapter 1.');

      fireEvent.click(pagination('Next Chapter'));
      await screen.findByText('Paragraph one of chapter 2.');
      fireEvent.click(pagination('Next Chapter'));
      await screen.findByText('Paragraph one of chapter 3.');

      act(() => {
        window.history.back();
      });

      expect(await screen.findByText('Start Reading')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-1');
    });
  });

  describe('顶部栏', () => {
    it('点主页图标回到首页', async () => {
      mockApi();
      await openChapter();
      clickContent();

      fireEvent.click(document.querySelector('.icon-home') as HTMLElement);

      expect(await screen.findByText('Hot Picks')).toBeTruthy();
      expect(currentUrl()).toBe('/');
    });

    it('点返回回到上一页', async () => {
      mockApi();
      renderApp('/book/book-1');
      fireEvent.click(await screen.findByText('Start Reading'));
      await screen.findByText('Paragraph one of chapter 1.');
      clickContent();

      fireEvent.click(document.querySelector('.ygm-nav-bar-left') as HTMLElement);

      expect(await screen.findByText('Start Reading')).toBeTruthy();
    });
  });

  describe('目录', () => {
    const catalogItems = () =>
      Array.from(document.querySelectorAll('.ygm-popup-left .catalogItem')) as HTMLElement[];

    it('点 Contents 打开目录，显示这本书的全部章节', async () => {
      mockApi();
      const { store } = await openChapter();
      clickContent();

      fireEvent.click(screen.getByText('Contents'));

      expect(chapterState(store).catalogVisible).toBe(true);
      await waitFor(() => expect(catalogItems().map((el) => el.textContent)).toEqual(orwell.chapters));
    });

    it('点目录里的章节，跳转并关闭目录', async () => {
      mockApi();
      const { store } = await openChapter();
      clickContent();
      fireEvent.click(screen.getByText('Contents'));
      await waitFor(() => expect(catalogItems()).toHaveLength(5));

      fireEvent.click(catalogItems()[3]);

      expect(await screen.findByText('Paragraph one of chapter 4.')).toBeTruthy();
      expect(currentUrl()).toBe('/book/book-1/4');
      expect(chapterState(store).catalogVisible).toBe(false);
    });

    it('点蒙层关闭目录', async () => {
      mockApi();
      const { store } = await openChapter();
      clickContent();
      fireEvent.click(screen.getByText('Contents'));

      fireEvent.click(document.querySelector('.ygm-popup .ygm-mask') as HTMLElement);

      expect(chapterState(store).catalogVisible).toBe(false);
    });
  });

  describe('进度条', () => {
    const openProgress = async (chapter: number) => {
      mockApi();
      const result = await openChapter(chapter);
      clickContent();
      fireEvent.click(screen.getByText('Progress'));
      return result;
    };

    it('点 Progress 打开进度条，显示当前章节', async () => {
      const { store } = await openProgress(2);

      expect(chapterState(store).footerProgressBarVisible).toBe(true);
      expect(progressValue()).toBe('chapter 2');
    });

    it('下一章：跳转并更新进度', async () => {
      await openProgress(2);

      fireEvent.click(progressButton('Next Chapter'));

      expect(await screen.findByText('Paragraph one of chapter 3.')).toBeTruthy();
      expect(progressValue()).toBe('chapter 3');
      expect(currentUrl()).toBe('/book/book-1/3');
    });

    it('上一章：跳转并更新进度', async () => {
      await openProgress(3);

      fireEvent.click(progressButton('Prev Chapter'));

      expect(await screen.findByText('Paragraph one of chapter 2.')).toBeTruthy();
      expect(progressValue()).toBe('chapter 2');
    });

    it('第一章时上一章是禁用样式，点击不跳转', async () => {
      await openProgress(1);

      expect(progressButton('Prev Chapter').classList.contains('disable')).toBe(true);
      fireEvent.click(progressButton('Prev Chapter'));

      expect(currentUrl()).toBe('/book/book-1/1');
      expect(progressValue()).toBe('chapter 1');
    });

    it('最后一章时下一章是禁用样式，点击不跳转', async () => {
      await openProgress(5);
      await waitFor(() => expect(progressButton('Next Chapter').classList.contains('disable')).toBe(true));

      fireEvent.click(progressButton('Next Chapter'));

      expect(currentUrl()).toBe('/book/book-1/5');
    });
  });

  describe('夜间模式', () => {
    it('切换到夜间模式：深色背景、白色文字，按钮变为 Light Mode', async () => {
      mockApi();
      const { store } = await openChapter();
      clickContent();

      fireEvent.click(screen.getByText('Night Mode'));

      expect(chapterState(store).nightTheme).toBe(true);
      expect(content().style.backgroundColor).toBe(toRgb(NIGHT_THEME));
      expect(content().style.color).toBe('rgb(255, 255, 255)');
      expect(screen.getByText('Light Mode')).toBeTruthy();
    });

    it('再点 Light Mode 恢复日间模式', async () => {
      mockApi();
      await openChapter();
      clickContent();
      fireEvent.click(screen.getByText('Night Mode'));

      fireEvent.click(screen.getByText('Light Mode'));

      expect(content().style.backgroundColor).toBe(toRgb(THEME[0]));
      expect(content().style.color).toBe('');
      expect(screen.getByText('Night Mode')).toBeTruthy();
    });
  });

  describe('设置', () => {
    const themeSelectors = () => Array.from(document.querySelectorAll('.settingBar .selector')) as HTMLElement[];

    const openSettings = async () => {
      mockApi();
      const result = await openChapter();
      clickContent();
      fireEvent.click(screen.getByText('Settings'));
      return result;
    };

    it('点 Settings 打开设置面板，当前主题是选中状态', async () => {
      const { store } = await openSettings();

      expect(chapterState(store).footerSettingBarVisible).toBe(true);
      expect(themeSelectors()).toHaveLength(THEME.length);
      expect(themeSelectors()[0].classList.contains('active')).toBe(true);
    });

    it('选择主题后正文背景跟着变，选中状态切换', async () => {
      await openSettings();

      fireEvent.click(themeSelectors()[2]);

      expect(content().style.backgroundColor).toBe(toRgb(THEME[2]));
      expect(themeSelectors()[2].classList.contains('active')).toBe(true);
      expect(themeSelectors()[0].classList.contains('active')).toBe(false);
    });

    it('夜间模式下选择主题，会退出夜间模式', async () => {
      const { store } = await openSettings();
      fireEvent.click(screen.getByText('Night Mode'));

      fireEvent.click(themeSelectors()[1]);

      expect(chapterState(store).nightTheme).toBe(false);
      expect(content().style.backgroundColor).toBe(toRgb(THEME[1]));
    });

    it('点字号滑块调整正文字号', async () => {
      await openSettings();
      const track = document.querySelector('.settingBar .ygm-slider') as HTMLElement;
      // jsdom 不做布局，手动给滑块轨道设置位置和宽度
      track.getBoundingClientRect = () => ({ left: 0, width: 140 }) as DOMRect;

      // 点在正中间：14 + (28 - 14) / 2 = 21
      fireEvent.click(track, { clientX: 70 });

      expect(content().style.fontSize).toBe('21px');
    });
  });

  describe('请求状态', () => {
    it('这本书没有章节数据时显示错误页', async () => {
      mockApi({ '/chapterInfoDetail': [] });

      renderApp('/book/book-1/1');

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());
    });

    it.each([
      ['接口报错', httpError(500)],
      ['断网', networkError()],
    ])('章节列表%s时显示错误页，不会一直停在加载中', async (_label, failure) => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApi({ '/chapterInfoDetail': failure });

      renderApp('/book/book-1/1');

      await waitFor(() => expect(document.querySelector('.ygm-error-block')).not.toBeNull());
      expect(document.querySelector('.ygm-spinner-loading')).toBeNull();

      jest.restoreAllMocks();
    });

    it('正文加载失败时仍显示章节标题', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      mockApi({ '/chapterContent': httpError(500) });

      renderApp('/book/book-1/2');

      await waitFor(() => expect(document.querySelector('.content h1')?.textContent).toBe('Chapter 2 of 1984'));
      expect(screen.queryByText('Paragraph one of chapter 2.')).toBeNull();

      jest.restoreAllMocks();
    });
  });
});
