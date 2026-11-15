import { preload } from 'swr';
import AxiosInstance from '@/hooks/useRequest/axiosInstance';
import { adoptPrefetchedHomeData } from '../hooks/useHomeData';

jest.mock('swr', () => ({ __esModule: true, ...jest.requireActual('swr'), preload: jest.fn() }));

const preloadMock = preload as jest.MockedFunction<typeof preload>;

/** 取出交给 preload 的 key 和 fetcher */
const preloaded = () => {
  expect(preloadMock).toHaveBeenCalledTimes(1);
  const [key, fetcher] = preloadMock.mock.calls[0];
  return { key, fetcher: fetcher as () => Promise<unknown> };
};

describe('adoptPrefetchedHomeData：接管 index.html 里提前发出的首页数据请求', () => {
  let requestSpy: jest.SpyInstance;

  beforeEach(() => {
    preloadMock.mockClear();
    requestSpy = jest.spyOn(AxiosInstance, 'request');
  });

  afterEach(() => {
    delete window.__HOME_DATA__;
    jest.restoreAllMocks();
  });

  it('没有提前请求时什么都不做', () => {
    adoptPrefetchedHomeData();

    expect(preloadMock).not.toHaveBeenCalled();
  });

  it('用和 useRequest 相同的 key 交给 SWR，结果包成 { code, msg, data }，不再发 axios 请求', async () => {
    const data = { banner: [] };
    window.__HOME_DATA__ = Promise.resolve(data);

    adoptPrefetchedHomeData();

    const { key, fetcher } = preloaded();
    expect(key).toBe('/headerCarousel');
    await expect(fetcher()).resolves.toEqual({ code: 200, msg: 'ok', data });
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('提前请求失败时改用 axios 重新请求', async () => {
    const fallback = { code: 200, msg: 'ok', data: { banner: [] } };
    requestSpy.mockResolvedValue(fallback);
    window.__HOME_DATA__ = Promise.reject(new Error('network'));

    adoptPrefetchedHomeData();

    await expect(preloaded().fetcher()).resolves.toBe(fallback);
    expect(requestSpy).toHaveBeenCalledWith({ url: '/headerCarousel' });
  });

  it('提前请求只接管一次，之后不会重复使用', () => {
    window.__HOME_DATA__ = Promise.resolve({});

    adoptPrefetchedHomeData();
    adoptPrefetchedHomeData();

    expect(preloadMock).toHaveBeenCalledTimes(1);
    expect(window.__HOME_DATA__).toBeUndefined();
  });
});
