import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const axiosConfig: AxiosRequestConfig = {
  timeout: 5000,
  headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  responseType: 'json',
};

const AxiosInstance = axios.create(axiosConfig);

const SUCCESS_CODE = 200;

/**
 * HTTP Client 层对外暴露的统一错误契约。
 * 无论错误来自网络层、超时、服务端非 2xx 响应，还是服务端 HTTP 状态是 200
 * 但响应体自己的业务 code 不是成功码，上层（SWR/Cache 层、Feature Hook 层）
 * 都只需要认识 { code, msg } 这一种形状，不用对"HTTP 成功但业务失败"这种情况
 * 再单独写一套判断逻辑。
 */
export interface INormalizedError {
  code: number;
  msg: string;
}

interface IStandardResponse {
  code: number;
  msg: string;
  data: unknown;
}

/**
 * 这个项目的 mock 数据（json-server）不是所有接口都按同一种形状返回：有的是裸数组
 * （/rank_male_001）、有的是裸对象（/ranking）、有的是完整的 { code, msg, data }
 * （/category、/searchHot），现在 /headerCarousel 又改成了只带 data 字段、没有
 * code/msg。用"有没有 data 这个字段"判断要不要补齐信封，而不是用"有没有 code
 * 字段"——后者在 headerCarousel 改格式之后会被误判成"裸数据"，把已经有的 data
 * 字段当成整个响应体，再包一层变成 response.data.data 这种双层嵌套，页面拿
 * data.banner 永远是 undefined。
 */
function normalizeResponseShape(responseData: unknown): IStandardResponse {
  const hasEnvelope =
    !Array.isArray(responseData) &&
    typeof responseData === 'object' &&
    responseData !== null &&
    'data' in responseData;

  if (!hasEnvelope) {
    return { code: SUCCESS_CODE, msg: 'ok', data: responseData };
  }

  const envelope = responseData as Partial<IStandardResponse>;
  return {
    code: envelope.code ?? SUCCESS_CODE,
    msg: envelope.msg ?? 'ok',
    data: envelope.data,
  };
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
    // 1. 基础校验：这里之前是 throw new Error(...)，不会走下面 normalizeError
    // 那一条统一错误契约，SWR 的 error 在这个分支下会是一个原始 Error 对象而不是
    // { code, msg }——跟这个文件顶部注释承诺的"上层只需要认识一种错误形状"是矛盾的，
    // 这次一并改成 reject 同一种 INormalizedError 形状。
    if (res.status !== 200 || !res.data) {
      return Promise.reject<INormalizedError>({ code: res.status, msg: `请求失败（${res.status}）` });
    }

    const standardized = normalizeResponseShape(res.data);

    // HTTP 状态码是 2xx，但响应体自己的业务 code 不是成功码——这种"传输层成功、
    // 业务层失败"的情况，重构前完全没有被处理，会被当成正常数据一路返回给调用方，
    // 调用方拿到的 data 可能是 null/不完整，但 SWR 的 error 永远是空的。
    // 统一收口在这里：只要业务 code 不是 SUCCESS_CODE，一律 reject 成跟网络错误、
    // HTTP 错误同一种 { code, msg } 形状。
    if (standardized.code !== SUCCESS_CODE) {
      return Promise.reject<INormalizedError>({ code: standardized.code, msg: standardized.msg });
    }

    return standardized;
  },
  (error: AxiosError) => {
    const normalized = normalizeError(error);
    console.error('Request Error:', normalized, error);
    return Promise.reject(normalized);
  },
);

export default AxiosInstance;