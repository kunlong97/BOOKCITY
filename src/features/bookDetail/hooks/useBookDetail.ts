import useRequest from '@/hooks/useRequest/useRequest';
import api from '../api';
import { TBookDetailDTO, TBookDetailVM } from '../types';

interface IUseBookDetailResult {
  data: TBookDetailVM;
  loading: boolean;
  error: unknown;
}

/**
 * "获取某本书的详情"这个请求逻辑只在这一处实现。最初是给 detail 页面写的（页面顶层
 * 一处请求 + Context 分发，见该次重构笔记），后来 chapter（阅读页）的目录/进度条
 * 也需要同一份数据，与其在 chapter 里再实现一遍，不如把这个 hook 提升到 pages 之外，
 * 作为一个跨页面复用的 feature 模块。
 */
function useBookDetail(id: string): IUseBookDetailResult {
  const { data, error } = useRequest<TBookDetailDTO, TBookDetailVM>(
    { url: api.getBook(id) },
    undefined,
    api.transformBookDetail
  );

  return {
    data,
    loading: !data && !error,
    error,
  };
}

export default useBookDetail;
