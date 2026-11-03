import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import AxiosInstance from '@/hooks/useRequest/axiosInstance';
import { IBookInfo } from '@/types/book';
import api from '../api';
import BookDetailContext, { useBookDetailContext } from '../context';
import useBookDetail from '../hooks/useBookDetail';

const book: IBookInfo = {
  bookId: '1001',
  title: '1984',
  author: 'George Orwell',
  categoryName: 'Dystopian Fiction',
  coverImg: '/cover/1001.png',
  desc: 'desc',
};

const ok = <T,>(data: T) => ({ code: 200, msg: 'ok', data });

// 每个测试使用独立的 SWR 缓存，失败时不自动重试
const swrWrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
    {children}
  </SWRConfig>
);

describe('bookDetail api', () => {
  it('getBook 生成按 bookId 过滤的查询地址', () => {
    expect(api.getBook('1001')).toBe('/book?bookId=1001');
  });

  it('transformBookDetail 从数组中取出第一本书', () => {
    expect(api.transformBookDetail([book])).toBe(book);
  });

  it('transformBookDetail 在没有命中时返回 undefined', () => {
    expect(api.transformBookDetail([])).toBeUndefined();
  });
});

describe('useBookDetail', () => {
  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    requestSpy = jest.spyOn(AxiosInstance, 'request');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('请求对应 bookId 的详情地址', async () => {
    requestSpy.mockResolvedValue(ok([book]));

    renderHook(() => useBookDetail('1001'), { wrapper: swrWrapper });

    await waitFor(() => expect(requestSpy).toHaveBeenCalledWith({ url: '/book?bookId=1001' }));
  });

  it('请求完成前 loading 为 true，完成后返回解包后的单本书', async () => {
    requestSpy.mockResolvedValue(ok([book]));

    const { result } = renderHook(() => useBookDetail('1001'), { wrapper: swrWrapper });

    expect(result.current).toEqual({ data: undefined, loading: true, error: undefined, notFound: false });

    await waitFor(() => expect(result.current.data).toEqual(book));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('请求失败时返回 error，loading 为 false', async () => {
    const error = { code: 404, msg: 'Request failed（404）' };
    requestSpy.mockRejectedValue(error);

    const { result } = renderHook(() => useBookDetail('1001'), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.error).toEqual(error));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.notFound).toBe(false);
  });

  it('书不存在（接口返回空数组）时 notFound 为 true，loading 为 false', async () => {
    requestSpy.mockResolvedValue(ok([]));

    const { result } = renderHook(() => useBookDetail('not-exist'), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('找到书时 notFound 为 false', async () => {
    requestSpy.mockResolvedValue(ok([book]));

    const { result } = renderHook(() => useBookDetail('1001'), { wrapper: swrWrapper });

    await waitFor(() => expect(result.current.data).toEqual(book));
    expect(result.current.notFound).toBe(false);
  });

  it('bookId 变化时请求新的书籍', async () => {
    const other = { ...book, bookId: '1002', title: 'Animal Farm' };
    requestSpy.mockImplementation(async ({ url }) => ok(url.endsWith('1002') ? [other] : [book]));

    const { result, rerender } = renderHook(({ id }) => useBookDetail(id), {
      wrapper: swrWrapper,
      initialProps: { id: '1001' },
    });
    await waitFor(() => expect(result.current.data?.title).toBe('1984'));

    rerender({ id: '1002' });

    await waitFor(() => expect(result.current.data?.title).toBe('Animal Farm'));
  });
});

describe('useBookDetailContext', () => {
  it('在 Provider 内且有数据时返回书籍信息', () => {
    const { result } = renderHook(() => useBookDetailContext(), {
      wrapper: ({ children }) => <BookDetailContext.Provider value={book}>{children}</BookDetailContext.Provider>,
    });

    expect(result.current).toBe(book);
  });

  it('没有 Provider 或数据为 null 时抛出异常', () => {
    // React 会把渲染期间的异常打印到 console.error，这里屏蔽掉避免干扰测试输出
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useBookDetailContext())).toThrow('useBookDetailContext must be used within');

    jest.restoreAllMocks();
  });
});
