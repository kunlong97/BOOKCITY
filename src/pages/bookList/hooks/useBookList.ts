import useInfiniteRequest from '@/hooks/useRequest/useInfiniteRequest';
import api from '../api';
import { IBookListDTO, IBookListVM, TPageKey } from '../types';

interface IUseBookListResult {
  data: IBookListVM[] | undefined;
  loading: boolean;
  /** 第一页就加载失败（页面上还没有任何书） */
  error: unknown;
  /** 已经有书了，加载下一页时失败 */
  loadMoreError: unknown;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  /** 重新请求失败的页 */
  retry: () => void;
}

/**
 * Feature Hook 层：只编排「调哪个接口、要不要翻页、翻页什么时候算到底」这些和
 * BookList 这个业务场景强相关的逻辑，不关心数据是怎么转换的（交给 API 层），
 * 也不关心请求是怎么发出去、怎么缓存的（交给 SWR/Cache 层）。
 * 页面组件只消费这里返回的 { data, loading, error, loadMoreError, hasMore, loadMore, retry }。
 */
function useBookList(pageKey: TPageKey): IUseBookListResult {
  const { data, error, size, setSize, isValidating, mutate } = useInfiniteRequest<IBookListDTO, IBookListVM>(
    { url: api.getBookList(pageKey) },
    undefined,
    api.transformBookListPage,
  );

  // 加载下一页失败时，SWR 会保留已经加载的页，同时返回 error。
  // 两种失败要分开处理：第一页失败整页报错；加载更多失败只在底部提示，保留已显示的书
  const loadMoreError = data ? error : undefined;

  // 取最后一页的 isLast 标记，判断是否还有下一页。
  // 加载更多失败时先停下来，等用户点重试；否则底部还在可视区域，会不停地自动重试
  const hasMore = data?.at(-1)?.isLast === false && !loadMoreError;

  const loadMore = async () => {
    // isValidating 为 true 说明上一页还在请求中，直接复用它做防重入，不需要额外加锁
    if (isValidating || !hasMore) return;
    await setSize(size + 1);
  };

  // size 在失败的那次 setSize 时已经加上去了，重新请求当前的 size 页即可
  const retry = () => {
    mutate();
  };

  return {
    data,
    loading: !data && !error,
    error: data ? undefined : error,
    loadMoreError,
    hasMore,
    loadMore,
    retry,
  };
}

export default useBookList;
