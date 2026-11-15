import { preload } from 'swr';
import useRequest, { buildKey } from '@/hooks/useRequest/useRequest';
import AxiosInstance, { wrapResponse } from '@/hooks/useRequest/axiosInstance';
import api from '../api';
import { IHomeData } from '../types';

interface IUseHomeDataResult {
  data: IHomeData | undefined;
  loading: boolean;
  error: unknown;
}

const homeRequest = { url: api.getHomeData };

/**
 * 接管 index.html 里提前发出的首页数据请求：交给 SWR 的 preload，
 * 用和 useRequest 完全相同的缓存 key，首页组件里的 useSWR 就会直接用这次请求的结果，不再重复请求。
 *
 * - 提前请求只用一次，接管后立刻清空；之后刷新、重新进入首页都走正常的 axios 请求
 * - 结果包装成和 axios 拦截器一样的 { code, msg, data }
 * - 提前请求失败时，改用 axios 重新请求一次，错误处理和原来完全一致
 */
export function adoptPrefetchedHomeData() {
  const prefetched = window.__HOME_DATA__;
  if (!prefetched) return;
  window.__HOME_DATA__ = undefined; // 提前发出的请求只用一次，用完就清掉，之后刷新或重新进入首页都走正常的 axios 请求

  const key = buildKey(homeRequest);
  if (!key) return;
  preload(key, () => prefetched.then(wrapResponse).catch(() => AxiosInstance.request(homeRequest)));
}

// 模块加载时执行一次（首页组件直接打包在入口里，所以这会在应用启动时、首页渲染之前执行）
adoptPrefetchedHomeData();

/**
 * 首页数据只有 Home 这一处发起请求。之前 Popular / Recommend / LimitedReader /
 * Ranking 四个子组件各自独立 useRequest 同一个 URL，跟 detail 重构前的问题
 * 是同一类——但这次不用 Context 分发，理由见 Home/index.tsx 里的说明。
 */
function useHomeData(): IUseHomeDataResult {
  const { data, error } = useRequest<IHomeData>(homeRequest);

  return {
    data,
    loading: !data && !error,
    error,
  };
}

export default useHomeData;
