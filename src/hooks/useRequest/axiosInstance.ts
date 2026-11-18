import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const axiosConfig: AxiosRequestConfig = {
  baseURL: '/api',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  responseType: 'json',
};

// axios.create 是官方文档的标准写法；axios 1.x 同时导出了具名的 create，eslint-plugin-import 会误报
// eslint-disable-next-line import/no-named-as-default-member
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

export interface IWrappedResponse<Data = unknown> {
  code: number;
  msg: string;
  data: Data;
}

/**
 * 把接口返回的裸数据包成 { code, msg, data }。
 * 响应拦截器和首页的提前请求（index.html 里用 fetch 发出的）都用它，保证两条路径拿到的结构一致。
 */
export function wrapResponse<Data>(data: Data): IWrappedResponse<Data> {
  return { code: SUCCESS_CODE, msg: 'ok', data };
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
    // axios 1.x 的类型要求拦截器返回 AxiosResponse，但这里是故意改了返回结构，
    // 调用方（useRequest / useInfiniteRequest）按 Response<Data> 使用，所以只能绕过类型
    return wrapResponse(res.data) as unknown as AxiosResponse;
  },
  (error: AxiosError) => {
    const normalized = normalizeError(error);
    console.error('Request Error:', normalized, error);
    return Promise.reject(normalized);
  },
);

export default AxiosInstance;
