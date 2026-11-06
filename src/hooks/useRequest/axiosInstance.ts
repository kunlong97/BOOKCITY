import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const axiosConfig: AxiosRequestConfig = {
  // 所有接口统一加 /api 前缀（vite.config.js 里代理时再去掉），避免和页面路由重名
  baseURL: '/api',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  responseType: 'json',
};

const AxiosInstance = axios.create(axiosConfig);

const SUCCESS_CODE = 200;

/**
 * HTTP Client 层对外暴露的统一错误契约。
 * 无论错误来自网络层、超时还是服务端非 2xx 响应，上层（SWR/Cache 层、Feature Hook 层）
 * 都只需要认识 { code, msg } 这一种形状。
 */
export interface INormalizedError {
  code: number;
  msg: string;
}

function normalizeError(error: AxiosError): INormalizedError {
  if (error.response) {
    // 服务端有响应，但状态码非 2xx
    return { code: error.response.status, msg: `Request failed（${error.response.status}）` };
  }
  if (error.request) {
    // 请求已发出，但未收到响应（超时/断网等）
    return { code: -1, msg: 'Network error, please check your connection and try again' };
  }
  // 请求还没发出就出错了（如配置错误）
  return { code: -2, msg: error.message || 'An unknown error occurred while making the request' };
}

AxiosInstance.interceptors.response.use(
  // mock 接口（json-server）统一返回裸数据，这里固定包成 { code, msg, data }，
  // 让 useRequest / useInfiniteRequest 的 Response<Data> 结构保持不变。
  // 非 2xx 的响应 axios 默认就会走下面的错误分支，这里不需要再判断状态码。
  (res: AxiosResponse) => {
    return { code: SUCCESS_CODE, msg: 'ok', data: res.data };
  },
  (error: AxiosError) => {
    const normalized = normalizeError(error);
    console.error('Request Error:', normalized, error);
    return Promise.reject(normalized);
  },
);

export default AxiosInstance;
