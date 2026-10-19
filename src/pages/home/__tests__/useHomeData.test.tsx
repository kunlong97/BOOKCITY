import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import AxiosInstance from '@/hooks/useRequest/axiosInstance';
import { IBookInfo } from '@/types/book';
import useHomeData from '../hooks/useHomeData';
import { IHomeData } from '../types';

const book: IBookInfo = {
  bookId: '1',
  title: '1984',
  author: 'George Orwell',
  categoryName: 'Dystopian Fiction',
  coverImg: '/cover/1.png',
  desc: 'desc',
};

const homeData: IHomeData = {
  banner: [{ src: '/banner/1.png', alt: 'banner' }],
  limited: [book],
  popular: [book],
  ranking: [{ id: 'male', title: 'Popular List', books: [book] }],
  recommend: [book],
};

const ok = <T,>(data: T) => ({ code: 200, msg: 'ok', data });

// 每个测试使用独立的 SWR 缓存，失败时不自动重试
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
    {children}
  </SWRConfig>
);

describe('useHomeData', () => {
  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    requestSpy = jest.spyOn(AxiosInstance, 'request');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('请求首页数据接口 /headerCarousel', async () => {
    requestSpy.mockResolvedValue(ok(homeData));

    renderHook(() => useHomeData(), { wrapper });

    await waitFor(() => expect(requestSpy).toHaveBeenCalledWith({ url: '/headerCarousel' }));
  });

  it('请求完成前 loading 为 true，完成后返回首页各模块数据', async () => {
    requestSpy.mockResolvedValue(ok(homeData));

    const { result } = renderHook(() => useHomeData(), { wrapper });

    expect(result.current).toEqual({ data: undefined, loading: true, error: undefined });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(homeData);
    expect(result.current.error).toBeUndefined();
  });

  it('请求失败时返回 error，loading 为 false', async () => {
    const error = { code: -1, msg: 'Network error, please check your connection and try again' };
    requestSpy.mockRejectedValue(error);

    const { result } = renderHook(() => useHomeData(), { wrapper });

    await waitFor(() => expect(result.current.error).toEqual(error));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
