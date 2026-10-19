import useInfiniteRequest from '@/hooks/useRequest/useInfiniteRequest';
import api from '../api';
import { IBookListDTO, IBookListVM, TPageKey } from '../types';

interface IUseBookListResult {
  data: IBookListVM[] | undefined;
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Feature Hook 层：只编排「调哪个接口、要不要翻页、翻页什么时候算到底」这些和
 * BookList 这个业务场景强相关的逻辑，不关心数据是怎么转换的（交给 API 层），
 * 也不关心请求是怎么发出去、怎么缓存的（交给 SWR/Cache 层）。
 * 页面组件只消费这里返回的 { data, loading, error, hasMore, loadMore }。
 */
function useBookList(pageKey: TPageKey): IUseBookListResult {
  const { data, error, size, setSize, isValidating } = useInfiniteRequest<IBookListDTO, IBookListVM>(
    { url: api.getBookList(pageKey) },
    undefined,
    api.transformBookListPage,
  );

  // 取最后一页的 isLast 标记，判断是否还有下一页
  const hasMore = data?.at(-1)?.isLast === false;

  const loadMore = async () => {
    // isValidating 为 true 说明上一页还在请求中，直接复用它做防重入，不需要额外加锁
    if (isValidating || !hasMore) return;
    await setSize(size + 1);
  };

  return {
    data,
    loading: !data && !error,
    error,
    hasMore,
    loadMore,
  };
}

export default useBookList;
