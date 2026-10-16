import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import AxiosInstance from '../axiosInstance';
import useInfiniteRequest from '../useInfiniteRequest';

// 每个测试使用独立的 SWR 缓存，关闭请求去重的时间窗口，失败时不自动重试
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
    {children}
  </SWRConfig>
);

const ok = <T,>(data: T) => ({ code: 200, msg: 'ok', data });

// 从请求的 url 中取出页码，模拟服务端按页返回数据
const pageOf = (url: string) => Number(new URL(url, 'http://localhost').searchParams.get('pageIndex'));

describe('useInfiniteRequest', () => {
  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    requestSpy = jest.spyOn(AxiosInstance, 'request');
    requestSpy.mockImplementation(async ({ url }) => ok({ page: pageOf(url) }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('默认请求第 1 页，url 带上 pageIndex=1', async () => {
    const { result } = renderHook(() => useInfiniteRequest({ url: '/bookList_001' }), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([{ page: 1 }]));
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledWith({ url: '/bookList_001?pageIndex=1' });
    expect(result.current.size).toBe(1);
  });

  it('response 保留每一页的原始响应', async () => {
    const { result } = renderHook(() => useInfiniteRequest({ url: '/bookList_001' }), { wrapper });

    await waitFor(() => expect(result.current.response).toEqual([ok({ page: 1 })]));
  });

  it('setSize 加载下一页，data 按页码顺序排列', async () => {
    const { result } = renderHook(() => useInfiniteRequest<{ page: number }>({ url: '/bookList_001' }), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      await result.current.setSize(2);
    });

    await waitFor(() => expect(result.current.data).toEqual([{ page: 1 }, { page: 2 }]));
    expect(result.current.size).toBe(2);
    expect(requestSpy).toHaveBeenLastCalledWith({ url: '/bookList_001?pageIndex=2' });
  });

  it('加载下一页时不会重新请求第 1 页（revalidateFirstPage: false）', async () => {
    const { result } = renderHook(() => useInfiniteRequest({ url: '/bookList_001' }), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      await result.current.setSize(2);
    });
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    const requestedUrls = requestSpy.mock.calls.map(([config]) => config.url);
    expect(requestedUrls).toEqual(['/bookList_001?pageIndex=1', '/bookList_001?pageIndex=2']);
  });

  it('请求失败时透传统一格式的 error', async () => {
    const error = { code: -1, msg: 'Network error, please check your connection and try again' };
    requestSpy.mockRejectedValue(error);

    const { result } = renderHook(() => useInfiniteRequest({ url: '/bookList_001' }), { wrapper });

    await waitFor(() => expect(result.current.error).toEqual(error));
    expect(result.current.data).toBeUndefined();
  });

  it('url 变化时从新 url 的第 1 页开始请求', async () => {
    requestSpy.mockImplementation(async ({ url }) => ok(url));

    const { result, rerender } = renderHook(({ url }) => useInfiniteRequest<string>({ url }), {
      wrapper,
      initialProps: { url: '/bookList_001' },
    });
    await waitFor(() => expect(result.current.data).toEqual(['/bookList_001?pageIndex=1']));

    rerender({ url: '/bookList_finish' });

    await waitFor(() => expect(result.current.data).toEqual(['/bookList_finish?pageIndex=1']));
  });
});
