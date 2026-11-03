import useRequest from '@/hooks/useRequest/useRequest';
import api from '../api';
import { TBookDetailDTO, TBookDetailVM } from '../types';

interface IUseBookDetailResult {
  data: TBookDetailVM;
  loading: boolean;
  error: unknown;
  /** 请求已完成，但没有这本书（json-server 对不存在的 bookId 返回空数组） */
  notFound: boolean;
}

/**
 * "获取某本书的详情"这个请求逻辑只在这一处实现。最初是给 detail 页面写的（页面顶层
 * 一处请求 + Context 分发，见该次重构笔记），后来 chapter（阅读页）的目录/进度条
 * 也需要同一份数据，与其在 chapter 里再实现一遍，不如把这个 hook 提升到 pages 之外，
 * 作为一个跨页面复用的 feature 模块。
 */
function useBookDetail(id: string): IUseBookDetailResult {
  const { data, error, response } = useRequest<TBookDetailDTO, TBookDetailVM>(
    { url: api.getBook(id) },
    undefined,
    api.transformBookDetail,
  );

  // 用"响应是否已经回来"判断加载状态，而不是看 data：
  // 书不存在时 data 解包出来是 undefined，用 data 判断会一直停在加载中
  return {
    data,
    loading: !response && !error,
    error,
    notFound: !!response && !data,
  };
}

export default useBookDetail;
