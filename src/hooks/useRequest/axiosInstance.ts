import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const axiosConfig: AxiosRequestConfig = {
  timeout: 5000,
  headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  responseType: 'json',
};

const AxiosInstance = axios.create(axiosConfig);

/**
 * HTTP Client 层对外暴露的统一错误契约。
 * 无论错误来自网络层、超时还是服务端非 2xx 响应，上层（SWR/Cache 层、Feature Hook 层）
 * 都只需要认识 { code, msg } 这一种形状，不需要关心 axios/fetch 各自的错误对象结构。
 */
export interface INormalizedError {
  code: number;
  msg: string;
}

function normalizeError(error: AxiosError): INormalizedError {
  if (error.response) {
    // 服务端有响应，但状态码非 2xx
    return { code: error.response.status, msg: `请求失败（${error.response.status}）` };
  }
  if (error.request) {
    // 请求已发出，但未收到响应（超时/断网等）
    return { code: -1, msg: '网络异常，请检查网络后重试' };
  }
  // 请求还没发出就出错了（如配置错误）
  return { code: -2, msg: error.message || '请求发生未知错误' };
}

AxiosInstance.interceptors.response.use(
  (res: AxiosResponse) => {
    // 1. 基础校验
    if (res.status !== 200 || !res.data) {
      throw new Error('Network Error or Empty Response');
    }

    const responseData = res.data;

    // 兼容本地 mock 服务（json-server）：它直接返回数组或裸对象，没有 { code, msg, data } 包装，
    // 这里统一补上外层结构，让消费方（useRequest/useInfiniteRequest）始终按同一种响应形状处理。
    const isMockData = Array.isArray(responseData) || responseData.code === undefined;

    if (isMockData) {
      return {
        code: 200,
        msg: 'ok',
        data: responseData,
      };
    }

    // 如果是返回的是标准数据,保持原样返回
    return responseData;
  },
  (error: AxiosError) => {
    const normalized = normalizeError(error);
    console.error('Request Error:', normalized, error);
    return Promise.reject(normalized);
  },
);

export default AxiosInstance;