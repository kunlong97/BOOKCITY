import { AxiosAdapter, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import AxiosInstance from '../axiosInstance';

// 用自定义 adapter 代替真实网络请求：resolve 一个指定的响应
const respondWith = (data: unknown, status = 200): AxiosAdapter => {
  return (config) => Promise.resolve({ data, status, statusText: '', headers: {}, config } as AxiosResponse);
};

// 用自定义 adapter 模拟请求失败
const failWith = (build: (config: AxiosRequestConfig) => AxiosError): AxiosAdapter => {
  return (config) => Promise.reject(build(config));
};

const request = (adapter: AxiosAdapter) => AxiosInstance.request({ url: '/test', adapter });

const NETWORK_ERROR_MSG = 'Network error, please check your connection and try again';

describe('axiosInstance', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('默认配置：接口统一加 /api 前缀、5 秒超时、JSON 请求头', () => {
    expect(AxiosInstance.defaults.baseURL).toBe('/api');
    expect(AxiosInstance.defaults.timeout).toBe(5000);
    // axios 0.27 的类型里 defaults.headers 只声明了 common/get/post 等分组，实际合并后顶层也有 Content-Type
    expect((AxiosInstance.defaults.headers as unknown as Record<string, unknown>)['Content-Type']).toBe(
      'application/json;charset=UTF-8',
    );
    expect(AxiosInstance.defaults.responseType).toBe('json');
  });

  describe('成功响应：裸数据固定包成 { code: 200, msg: "ok", data }', () => {
    it.each([
      ['数组（如 /bookList、/searchHot）', [{ bookId: '1' }, { bookId: '2' }]],
      ['对象（如 /headerCarousel）', { banner: ['a.png'], limited: [] }],
      ['空数组', []],
      ['空对象', {}],
    ])('%s', async (_label, body) => {
      await expect(request(respondWith(body))).resolves.toEqual({ code: 200, msg: 'ok', data: body });
    });
  });

  describe('请求失败统一为 { code, msg }', () => {
    it('服务端返回非 2xx：code 为 HTTP 状态码', async () => {
      const adapter = failWith(
        (config) =>
          new AxiosError(
            'Request failed with status code 404',
            'ERR_BAD_REQUEST',
            config,
            {},
            {
              data: {},
              status: 404,
              statusText: 'Not Found',
              headers: {},
              config,
            },
          ),
      );

      await expect(request(adapter)).rejects.toEqual({ code: 404, msg: 'Request failed（404）' });
    });

    it('请求已发出但没有响应（超时/断网）：code 为 -1', async () => {
      const adapter = failWith((config) => new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED', config, {}));

      await expect(request(adapter)).rejects.toEqual({ code: -1, msg: NETWORK_ERROR_MSG });
    });

    it('请求还没发出就出错：code 为 -2，msg 为错误信息', async () => {
      const adapter = failWith((config) => new AxiosError('Invalid URL', 'ERR_BAD_OPTION', config));

      await expect(request(adapter)).rejects.toEqual({ code: -2, msg: 'Invalid URL' });
    });

    it('没有错误信息时使用默认 msg', async () => {
      const adapter = failWith((config) => new AxiosError('', undefined, config));

      await expect(request(adapter)).rejects.toEqual({
        code: -2,
        msg: 'An unknown error occurred while making the request',
      });
    });
  });
});
