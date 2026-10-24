import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import useLockFn from '@/hooks/useLockFn';
import { useCallback, useEffect, useRef } from 'react';
import SpinnerLoading from '../spinner-loading';

export interface InfiniteScrollProps {
  /** 是否加载更多 */
  hasMore: boolean;
  /** 加载数据方法 */
  loadMore: () => Promise<void>;
  /** 自定义底部样式 */
  footer?: React.ReactNode; //** 自定义底部状态区域的 UI（比如自定义“没有更多了”的提示） */
  children: React.ReactNode;
}

const classPrefix = 'ygm-infinite-scroll';

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({ hasMore, loadMore, footer, children }) => {
  const doLoadMore = useLockFn(() => loadMore());
  const intersectionEleRef = useRef<HTMLDivElement>(null); //使用之前封装的useIntersectionObserver，来检测footer，如果滑到footer就加载数据
  const observerEntry = useIntersectionObserver(intersectionEleRef, {});
  const check = useCallback(async () => {
    if (!observerEntry?.isIntersecting) return; //“哨兵”不可见，直接退出
    if (!hasMore) return; //如果没有更多数据了，直接退出

    doLoadMore(); //在上一次请求还没有结束就不再调用loadMore，上一次请求结束后再调用loadMore，封装一个useLockFn
  }, [doLoadMore, observerEntry?.isIntersecting, hasMore]);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <div className={classPrefix}>
      {children}
      <div className={`${classPrefix}-load`} ref={intersectionEleRef}>
        {footer && footer}
        {!footer && (hasMore ? <SpinnerLoading size={16} /> : '')}
      </div>
    </div>
  );
};

InfiniteScroll.displayName = 'InfiniteScroll';

export default InfiniteScroll;
