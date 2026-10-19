import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import AxiosInstance from '@/hooks/useRequest/axiosInstance';
import api from '../api';
import useBookList from '../hooks/useBookList';
import { IBookItemDTO, IBookListDTO } from '../types';

const createBook = (bookId: string, categoryName?: string): IBookItemDTO => ({
  bookId,
  title: `书名${bookId}`,
  author: '作者',
  coverImg: `/cover/${bookId}.png`,
  desc: '简介',
  ...(categoryName ? { categoryName } : {}),
});

const ok = <T,>(data: T) => ({ code: 200, msg: 'ok', data });

const pageOf = (url: string) => Number(new URL(url, 'http://localhost').searchParams.get('pageIndex'));

// 模拟一个共 totalPages 页的书单，每页一本书，最后一页 isLast 为 true
const mockPages =
  (totalPages: number) =>
  async ({ url }: { url: string }) => {
    const page = pageOf(url);
    const dto: IBookListDTO = { bookList: [createBook(`p${page}`, '科幻')], isLast: page >= totalPages };
    return ok(dto);
  };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
    {children}
  </SWRConfig>
);

describe('bookList api', () => {
  it('getBookList 按 key 生成接口地址', () => {
    expect(api.getBookList('001')).toBe('/bookList_001');
    expect(api.getBookList('finish')).toBe('/bookList_finish');
  });

  it('transformBookListPage 给缺失的 categoryName 补默认值，已有的保持不变', () => {
    const vm = api.transformBookListPage({
      bookList: [createBook('1'), createBook('2', '科幻'), { ...createBook('3'), categoryName: '' }],
      isLast: true,
    });

    expect(vm.bookList.map((b) => b.categoryName)).toEqual(['Uncategorized', '科幻', 'Uncategorized']);
    expect(vm.isLast).toBe(true);
  });

  it('transformBookListPage 保留书籍的其他字段', () => {
    const book = createBook('1');
    const vm = api.transformBookListPage({ bookList: [book], isLast: false });
    expect(vm.bookList[0]).toEqual({ ...book, categoryName: 'Uncategorized' });
  });
});

describe('useBookList', () => {
  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    requestSpy = jest.spyOn(AxiosInstance, 'request');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('请求对应 key 的第 1 页', async () => {
    requestSpy.mockImplementation(mockPages(3));

    renderHook(() => useBookList('001'), { wrapper });

    await waitFor(() => expect(requestSpy).toHaveBeenCalledWith({ url: '/bookList_001?pageIndex=1' }));
  });

  it('请求完成前 loading 为 true，完成后返回转换后的数据', async () => {
    requestSpy.mockResolvedValue(ok({ bookList: [createBook('1')], isLast: true }));

    const { result } = renderHook(() => useBookList('001'), { wrapper });
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([
      { bookList: [{ ...createBook('1'), categoryName: 'Uncategorized' }], isLast: true },
    ]);
    expect(result.current.error).toBeUndefined();
  });

  describe('hasMore', () => {
    it('最后一页 isLast 为 false 时还有更多', async () => {
      requestSpy.mockImplementation(mockPages(3));

      const { result } = renderHook(() => useBookList('001'), { wrapper });

      await waitFor(() => expect(result.current.data).toHaveLength(1));
      expect(result.current.hasMore).toBe(true);
    });

    it('只有一页且 isLast 为 true 时没有更多', async () => {
      requestSpy.mockImplementation(mockPages(1));

      const { result } = renderHook(() => useBookList('001'), { wrapper });

      await waitFor(() => expect(result.current.data).toHaveLength(1));
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('loadMore', () => {
    it('加载下一页并追加到 data 末尾', async () => {
      requestSpy.mockImplementation(mockPages(3));
      const { result } = renderHook(() => useBookList('001'), { wrapper });
      await waitFor(() => expect(result.current.data).toHaveLength(1));

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => expect(result.current.data).toHaveLength(2));
      expect(result.current.data?.map((p) => p.bookList[0].bookId)).toEqual(['p1', 'p2']);
      expect(requestSpy).toHaveBeenLastCalledWith({ url: '/bookList_001?pageIndex=2' });
    });

    it('加载到最后一页后 hasMore 变为 false', async () => {
      requestSpy.mockImplementation(mockPages(2));
      const { result } = renderHook(() => useBookList('001'), { wrapper });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => expect(result.current.data).toHaveLength(2));
      expect(result.current.hasMore).toBe(false);
    });

    it('没有更多数据时调用 loadMore 不会发请求', async () => {
      requestSpy.mockImplementation(mockPages(1));
      const { result } = renderHook(() => useBookList('001'), { wrapper });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
      const callsBefore = requestSpy.mock.calls.length;

      await act(async () => {
        await result.current.loadMore();
      });

      expect(requestSpy).toHaveBeenCalledTimes(callsBefore);
      expect(result.current.data).toHaveLength(1);
    });

    it('请求失败时返回 error，loading 为 false', async () => {
      const error = { code: 404, msg: 'Request failed（404）' };
      requestSpy.mockRejectedValue(error);

      const { result } = renderHook(() => useBookList('001'), { wrapper });

      await waitFor(() => expect(result.current.error).toEqual(error));
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
