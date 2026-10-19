import { AxiosRequestConfig } from 'axios';
import AxiosInstance, { INormalizedError } from '@/hooks/useRequest/axiosInstance';

import useSWRInfinite, { SWRInfiniteConfiguration, SWRInfiniteResponse } from 'swr/infinite';

interface Response<Data> {
  code: number;
  data: Data;
  msg: string;
}

function getKey(pageIndex: number, url: string) {
  return `${url}?pageIndex=${pageIndex + 1}`;
}

/**
 * Pick<...> 是 TypeScript 的内置工具类型，它的作用是从一个庞大的对象类型中，挑选（Pick）出你需要的几个属性。
 * 这里从 SWR 官方提供的 SWRInfiniteResponse 类型中，只挑选了 5 个核心属性：
 * 这个接口又额外定义了 2 个属性data和response
 */
interface Return<Data, VM>
  extends Pick<
    SWRInfiniteResponse<Response<Data>, INormalizedError>,
    'isValidating' | 'error' | 'mutate' | 'size' | 'setSize'
  > {
  data: VM[] | undefined;
  response: Response<Data>[] | undefined;
}

/**
 * SWR/Cache 层：只负责分页 key 生成、发请求、去重缓存这些和具体业务无关的机制。
 * 第三个参数 transform 是留给 API 层的钩子——把「接口原始数据 -> 视图模型」的转换逻辑
 * 交给调用方（各页面的 api.ts）decide，这个 hook 本身不认识任何业务字段。
 * 不传 transform 时行为和之前完全一致（VM 退化为 Data）。
 */
function useInfiniteRequest<Data = unknown, VM = Data>(
  request: AxiosRequestConfig,
  config?: SWRInfiniteConfiguration,
  transform?: (data: Data) => VM
): Return<Data, VM> {
  const {
    data: response,   //将 data 属性的值赋值给一个新的局部变量response(对象解构赋值语法)
    error,
    isValidating,
    mutate,
    size,
    setSize,
  } = useSWRInfinite<Response<Data>, INormalizedError>(
    (pageIndex: number) => getKey(pageIndex, request.url!),   //这里写成箭头函数是为了拿到request.url的值(因为request.url在useInfiniteRequest函数里,getKey函数是在外面定义的,直接拿拿不到useInfiniteRequest里的值)
    (url: string) => AxiosInstance.request({ url }),
    { ...config}
  );

  return {
    data: response?.map((item) => (transform ? transform(item.data) : (item.data as unknown as VM))),
    response,
    mutate,
    error,
    isValidating,
    size,
    setSize,
  };
}

export default useInfiniteRequest;



