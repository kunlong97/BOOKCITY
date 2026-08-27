import useRequest from '@/hooks/useRequest/useRequest';
import api from '../api';
import { IHomeData } from '../types';

interface IUseHomeDataResult {
  data: IHomeData | undefined;
  loading: boolean;
  error: unknown;
}

/**
 * 首页数据只有 Home 这一处发起请求。之前 Popular / Recommend / LimitedReader /
 * Ranking 四个子组件各自独立 useRequest 同一个 URL，跟 detail 重构前的问题
 * 是同一类——但这次不用 Context 分发，理由见 Home/index.tsx 里的说明。
 */
function useHomeData(): IUseHomeDataResult {
  const { data, error } = useRequest<IHomeData>({ url: api.getHomeData });

  return {
    data,
    loading: !data && !error,
    error,
  };
}

export default useHomeData;
