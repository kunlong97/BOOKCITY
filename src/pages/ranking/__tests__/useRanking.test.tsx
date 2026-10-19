import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import AxiosInstance from '@/hooks/useRequest/axiosInstance';
import api from '../api';
import useRanking from '../hooks/useRanking';
import { IRanking } from '../types';

const ranking: IRanking = [
  { id: 1, key: '001', title: '最热榜', cover: '', shortTitle: 'Popular List' },
  { id: 2, key: '002', title: '畅销榜', cover: '', shortTitle: 'Bestseller list' },
];

const ok = <T,>(data: T) => ({ code: 200, msg: 'ok', data });

// 每个测试使用独立的 SWR 缓存，失败时不自动重试
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
    {children}
  </SWRConfig>
);

describe('ranking api', () => {
  it('ranking 为榜单列表接口地址', () => {
    expect(api.ranking).toBe('/ranking');
  });

  it.each([
    ['001', '/rank_001'],
    ['004', '/rank_004'],
  ])('getBookList(%s) 生成 %s', (key, expected) => {
    expect(api.getBookList(key)).toBe(expected);
  });
});   

describe('useRanking', () => {
  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    requestSpy = jest.spyOn(AxiosInstance, 'request');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('请求榜单列表接口 /ranking', async () => {
    requestSpy.mockResolvedValue(ok(ranking));

    renderHook(() => useRanking(), { wrapper });

    await waitFor(() => expect(requestSpy).toHaveBeenCalledWith({ url: '/ranking' }));
  });

  it('请求完成前 loading 为 true，完成后返回榜单列表', async () => {
    requestSpy.mockResolvedValue(ok(ranking));

    const { result } = renderHook(() => useRanking(), { wrapper });

    expect(result.current).toEqual({ data: undefined, loading: true, error: undefined });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(ranking);
    expect(result.current.error).toBeUndefined();
  });

  it('请求失败时返回 error，loading 为 false', async () => {
    const error = { code: 500, msg: 'Request failed（500）' };
    requestSpy.mockRejectedValue(error);

    const { result } = renderHook(() => useRanking(), { wrapper });

    await waitFor(() => expect(result.current.error).toEqual(error));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
