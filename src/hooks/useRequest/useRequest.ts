import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { AxiosRequestConfig } from 'axios';
import AxiosInstance, { INormalizedError } from '@/hooks/useRequest/axiosInstance';

interface Response<Data> {
  code: number;
  data: Data;
  msg: string;
}

interface useRequestResponse<Data, VM>
  extends Pick<SWRResponse<Response<Data>, INormalizedError>, 'isValidating' | 'error' | 'mutate'> {
  data: VM | undefined;
  response: Response<Data> | undefined;
}

/**
 * SWR 用这个返回值判断"这是不是同一个请求"：key 不变就复用缓存，key 变了才重新发请求。
 * 之前这里直接把 request.url 当 key，如果同一个 url 靠 params 区分不同的数据
 * （比如按关键词搜索），SWR 会把它们当成同一个缓存条目——调用方只能自己在 useEffect
 * 里手动 mutate() 强制重新请求，这个手动触发和 SWR 本该自动完成的"key 变了就重新
 * 请求"是两套逻辑，容易不同步（search 页面重构时就是这么踩的坑）。
 * request 为 null 时返回 null，SWR 会跳过这次请求，用来支持"当前不需要发这个请求"
 * 的场景（比如搜索关键词还是空的时候）。
 */
function buildKey(request: AxiosRequestConfig | null): string | null {
  if (!request?.url) return null;
  if (!request.params) return request.url;
  return `${request.url}?${JSON.stringify(request.params)}`;
}

/**
 * 和 useInfiniteRequest 一样，第三个参数 transform 是留给 API 层的钩子，
 * 不传时行为和之前完全一致（VM 退化为 Data）。
 * request 允许传 null，用来支持"某些条件不满足时不发请求"（SWR 的 conditional fetching）。
 */
function useRequest<Data = unknown, VM = Data>(
  request: AxiosRequestConfig | null,
  config?: SWRConfiguration,
  transform?: (data: Data) => VM
): useRequestResponse<Data, VM> {
  const {
    data: response,
    error,
    mutate,
    isValidating,
  } = useSWR<Response<Data>, INormalizedError>(
    buildKey(request),
    () => AxiosInstance.request(request as AxiosRequestConfig),
    config
  );

  return {
    data: response ? (transform ? transform(response.data) : (response.data as unknown as VM)) : undefined,
    response,
    error,
    mutate,
    isValidating,
  };
}

export default useRequest;
