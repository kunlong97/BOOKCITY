import useRequest from '@/hooks/useRequest/useRequest';
import api from '../api';
import { IRanking } from '../types';

interface IUseRankingResult {
  data: IRanking | undefined;
  loading: boolean;
  error: unknown;
}

/**
 * 排行榜数据只有这一处发起请求。之前 Ranking 页面自己和 RankingContent
 * 各自独立 useRequest 同一个 /ranking，页面自己那次调用甚至没有带类型参数
 * （data 是 unknown）——跟 detail/home 重构前的问题是同一类。
 * RankingContent 是 Ranking 的直接子组件，中间没有穿透层，所以跟 home 一样
 * 用 props 分发，不用 Context。
 */
function useRanking(): IUseRankingResult {
  const { data, error } = useRequest<IRanking>({ url: api.ranking });

  return {
    data,
    loading: !data && !error,
    error,
  };
}

export default useRanking;
