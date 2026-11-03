import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { chapterReducer } from '@/pages/chapter/chapterSlice';
import { HISTORY_SEARCH_KEY } from '@/pages/search/constants';
import { searchReducer } from '@/pages/search/searchSlice';
import { shelfReducer } from '@/pages/shelf/shelfSlice';
import AppRouter from '@/routers';
import { RootState } from '@/store/store';
import { IBookInfo } from '@/types/book';

// 和 store/store.ts 同样的 reducer，但每个用例一份新的，避免 Redux 状态在用例之间串
export const createTestStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: { Shelf: shelfReducer, Chapter: chapterReducer, Search: searchReducer },
    preloadedState,
  });

interface RenderAppOptions {
  /** Redux 初始状态，比如让书架直接处于编辑模式 */
  preloadedState?: Partial<RootState>;
}

/**
 * 渲染真实的路由和页面，结构和 App.tsx 一致，只有两点不同：
 * store 是新建的；SWR 用独立缓存、关闭去重窗口和失败重试，保证用例之间互不影响。
 * 用 BrowserRouter 而不是 MemoryRouter：搜索页直接读写 window.location 和 window.history。
 * 页面是 React.lazy 加载的，断言内容时要用 findBy*，不能用 getBy*。
 */
export const renderApp = (path = '/', { preloadedState }: RenderAppOptions = {}) => {
  window.history.pushState(null, '', path);

  const store = createTestStore(preloadedState);
  const utils = render(
    <Provider store={store}>
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </SWRConfig>
    </Provider>,
  );

  return { ...utils, store };
};

// 当前地址，如 /search?keyword=abc
export const currentUrl = () => window.location.pathname + decodeURIComponent(window.location.search);

// 预置书架数据（书架存在 localStorage 里）。在 renderApp 之前调用
export const seedShelf = (shelfBooks: IBookInfo[] = [], groups: Record<string, IBookInfo[]> = {}) => {
  localStorage.setItem('shelf', JSON.stringify(shelfBooks));
  localStorage.setItem('shelf-group', JSON.stringify(groups));
};

export const seedSearchHistory = (keywords: string[]) => {
  localStorage.setItem(HISTORY_SEARCH_KEY, JSON.stringify(keywords));
};

export const readShelf = (): IBookInfo[] => JSON.parse(localStorage.getItem('shelf') || '[]');
export const readGroups = (): Record<string, IBookInfo[]> => JSON.parse(localStorage.getItem('shelf-group') || '{}');
export const readSearchHistory = (): string[] => JSON.parse(localStorage.getItem(HISTORY_SEARCH_KEY) || '[]');
