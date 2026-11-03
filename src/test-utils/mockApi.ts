import { AxiosAdapter, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { parse } from 'query-string';
import AxiosInstance from '@/hooks/useRequest/axiosInstance';
import { IBookInfo } from '@/types/book';
import {
  allBooks,
  books,
  categories,
  chapterContents,
  chapterDetails,
  chapterIntro,
  homeData,
  hotSearches,
  rankings,
} from './fixtures';

export interface MockRequest {
  url: string;
  /** 不带查询参数的路径，如 /book */
  path: string;
  /** 合并了 url 上的查询参数和 config.params */
  query: Record<string, string>;
}

/**
 * 接口的返回内容，可以是：
 * - 任意数据：作为响应体返回
 * - 函数：根据请求动态返回数据，也可以返回 Promise（用来模拟请求进行中的状态）
 * - httpError(status) / networkError()：模拟请求失败
 */
export type MockRoutes = Record<string, unknown>;

class MockFailure {
  constructor(public status?: number) {}
}

export const httpError = (status: number) => new MockFailure(status);
export const networkError = () => new MockFailure();

// 模拟分页书单：第 pageIndex 页返回 pages[pageIndex - 1]，最后一页 isLast 为 true
export const pagedBookList =
  (pages: IBookInfo[][]) =>
  ({ query }: MockRequest) => {
    const pageIndex = Number(query.pageIndex ?? 1);
    return { bookList: pages[pageIndex - 1] ?? [], isLast: pageIndex >= pages.length };
  };

const includesText = (book: IBookInfo, keyword: string) =>
  [book.title, book.author, book.desc].some((text) => text.toLowerCase().includes(keyword.toLowerCase()));

// 默认接口，行为和 json-server 一致：过滤查询返回数组，查不到返回空数组
const defaultRoutes = (): MockRoutes => ({
  '/headerCarousel': homeData,
  '/searchHot': hotSearches,
  '/category': categories,
  '/ranking': rankings,
  '/rank_001': [books.orwell, books.hobbit],
  '/rank_002': [books.gatsby],
  '/book': ({ query }: MockRequest) => allBooks.filter((book) => book.bookId === query.bookId),
  '/bookList': ({ query }: MockRequest) => (query.q ? allBooks.filter((book) => includesText(book, query.q)) : allBooks),
  '/chapterInfo': chapterIntro,
  '/chapterInfoDetail': ({ query }: MockRequest) => chapterDetails.filter((item) => item.bookId === query.bookId),
  '/chapterContent': ({ query }: MockRequest) => chapterContents.filter((item) => item.chapterId === query.chapterId),
  '/bookList_001': pagedBookList([[books.orwell, books.hobbit], [books.farm]]),
  '/bookList_002': pagedBookList([[books.gatsby]]),
  '/bookList_finish': pagedBookList([[books.farm]]),
  '/bookList_recommend': pagedBookList([[books.gatsby]]),
  '/bookList_hotpicks': pagedBookList([[books.orwell]]),
  '/bookList_todaypicks': pagedBookList([[books.hobbit]]),
});

const createAxiosError = (failure: MockFailure, config: AxiosRequestConfig) => {
  if (failure.status === undefined) {
    return new AxiosError('Network Error', 'ERR_NETWORK', config, {});
  }
  const response = { data: {}, status: failure.status, statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError(`Request failed with status code ${failure.status}`, 'ERR_BAD_RESPONSE', config, {}, response);
};

const toRequest = (config: AxiosRequestConfig): MockRequest => {
  const url = config.url ?? '';
  const [path, search = ''] = url.split('?');
  const query = { ...parse(search), ...config.params } as Record<string, string>;
  return { url, path, query };
};

const originalAdapter = AxiosInstance.defaults.adapter;

/**
 * 替换 axios 的 adapter，让请求不走网络。axiosInstance 的拦截器和 useRequest 都是真实运行的。
 * 默认接口都已配置好，用例只需要传入想覆盖的部分：
 *   const api = mockApi({ '/category': httpError(500) });
 *   api.callsTo('/bookList')[0].query.q;
 * 没有配置的接口返回 404，和 json-server 一样。每个用例结束后自动恢复。
 */
export const mockApi = (overrides: MockRoutes = {}) => {
  const routes: MockRoutes = { ...defaultRoutes(), ...overrides };
  const calls: MockRequest[] = [];

  const adapter: AxiosAdapter = async (config) => {
    const request = toRequest(config);
    calls.push(request);

    const route = request.path in routes ? routes[request.path] : httpError(404);
    const result = typeof route === 'function' ? await route(request) : route;

    if (result instanceof MockFailure) {
      throw createAxiosError(result, config);
    }
    return { data: result, status: 200, statusText: 'OK', headers: {}, config };
  };

  AxiosInstance.defaults.adapter = adapter;

  return {
    /** 所有已发出的请求 */
    calls,
    /** 发往指定路径的请求 */
    callsTo: (path: string) => calls.filter((call) => call.path === path),
    /** 中途修改接口，比如让下一次请求失败 */
    use: (next: MockRoutes) => Object.assign(routes, next),
  };
};

export const resetMockApi = () => {
  AxiosInstance.defaults.adapter = originalAdapter;
};
