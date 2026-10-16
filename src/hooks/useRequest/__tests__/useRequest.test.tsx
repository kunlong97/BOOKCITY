import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import AxiosInstance from '../axiosInstance';
import useRequest from '../useRequest';

// 每个测试使用独立的 SWR 缓存，关闭请求去重的时间窗口，避免测试之间互相影响
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

const ok = <T,>(data: T) => ({ code: 200, msg: 'ok', data });

describe('useRequest', () => {
  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    requestSpy = jest.spyOn(AxiosInstance, 'request');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('请求成功后返回 data 和完整的 response', async () => {
    requestSpy.mockResolvedValue(ok([{ id: 1 }]));

    const { result } = renderHook(() => useRequest<{ id: number }[]>({ url: '/category' }), { wrapper });

    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]));
    expect(result.current.response).toEqual(ok([{ id: 1 }]));
    expect(result.current.error).toBeUndefined();
  });

  it('把传入的请求配置原样交给 AxiosInstance.request', async () => {
    requestSpy.mockResolvedValue(ok([]));
    const request = { url: '/search', params: { keyword: '三体' } };

    renderHook(() => useRequest(request), { wrapper });

    await waitFor(() => expect(requestSpy).toHaveBeenCalledWith(request));
  });

  it('传入 transform 时 data 为转换后的结果，response 仍是原始数据', async () => {
    requestSpy.mockResolvedValue(ok([{ id: 1, name: 'a' }]));

    const { result } = renderHook(
      () => useRequest<{ id: number; name: string }[], string[]>({ url: '/category' }, undefined, (list) =>
        list.map((item) => item.name),
      ),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toEqual(['a']));
    expect(result.current.response?.data).toEqual([{ id: 1, name: 'a' }]);
  });

  it('请求失败时透传统一格式的 error', async () => {
    const error = { code: 404, msg: 'Request failed（404）' };
    requestSpy.mockRejectedValue(error);

    const { result } = renderHook(() => useRequest({ url: '/missing' }), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
          {children}
        </SWRConfig>
      ),
    });

    await waitFor(() => expect(result.current.error).toEqual(error));
    expect(result.current.data).toBeUndefined();
  });

  describe('条件请求', () => {
    it('request 为 null 时不发请求', async () => {
      const { result } = renderHook(() => useRequest(null), { wrapper });

      // 等待一个宏任务，确认 SWR 没有在之后发起请求
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(requestSpy).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it('request 没有 url 时不发请求', async () => {
      renderHook(() => useRequest({ params: { keyword: 'a' } }), { wrapper });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(requestSpy).not.toHaveBeenCalled();
    });

    it('request 从 null 变为有效配置时开始请求', async () => {
      requestSpy.mockResolvedValue(ok(['result']));

      const { result, rerender } = renderHook(({ request }) => useRequest<string[]>(request), {
        wrapper,
        initialProps: { request: null as { url: string; params?: object } | null },
      });

      rerender({ request: { url: '/search', params: { keyword: '三体' } } });

      await waitFor(() => expect(result.current.data).toEqual(['result']));
      expect(requestSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('缓存 key：url + params', () => {
    it('params 变化时自动重新请求', async () => {
      requestSpy.mockImplementation(async (config) => ok(`result of ${config.params.keyword}`));

      const { result, rerender } = renderHook(({ keyword }) => useRequest<string>({ url: '/search', params: { keyword } }), {
        wrapper,
        initialProps: { keyword: 'a' },
      });

      await waitFor(() => expect(result.current.data).toBe('result of a'));

      rerender({ keyword: 'b' });

      await waitFor(() => expect(result.current.data).toBe('result of b'));
      expect(requestSpy).toHaveBeenCalledTimes(2);
    });

    it('url 和 params 都相同的两个调用共享同一个请求', async () => {
      requestSpy.mockResolvedValue(ok('shared'));

      // 同一个 wrapper 实例下渲染两个 hook，共享同一份 SWR 缓存
      const { result } = renderHook(
        () => ({
          a: useRequest<string>({ url: '/search', params: { keyword: 'a' } }),
          b: useRequest<string>({ url: '/search', params: { keyword: 'a' } }),
        }),
        { wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig> },
      );

      await waitFor(() => expect(result.current.a.data).toBe('shared'));
      expect(result.current.b.data).toBe('shared');
      expect(requestSpy).toHaveBeenCalledTimes(1);
    });

    it('url 相同但 params 不同时分别请求、分别缓存', async () => {
      requestSpy.mockImplementation(async (config) => ok(config.params.keyword));

      const { result } = renderHook(
        () => ({
          a: useRequest<string>({ url: '/search', params: { keyword: 'a' } }),
          b: useRequest<string>({ url: '/search', params: { keyword: 'b' } }),
        }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.a.data).toBe('a');
        expect(result.current.b.data).toBe('b');
      });
      expect(requestSpy).toHaveBeenCalledTimes(2);
    });
  });
});
