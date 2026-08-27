import { createContext, useContext } from 'react';
import { IBookInfo } from '@/types/book';

/**
 * 两种消费方式对应两种不同的使用场景，不要混用：
 *
 * 1. `useBookDetailContext()` —— 用在"数据没到就不渲染这棵子树"的场景（比如 detail 页面，
 *    Provider 只在 useBookDetail 拿到数据之后才会挂载子树）。这种场景下 Provider 内部
 *    读到 null 只可能是用错了地方，所以直接 throw，把隐含约定变成显式检查。
 *
 * 2. 直接 `useContext(BookDetailContext)` —— 用在"数据还没到也要先渲染出壳子"的场景
 *    （比如 chapter 页面的目录/进度条弹层，本身默认是收起的，没必要因为书籍信息没加载完
 *    就连整个阅读页都不渲染）。这种场景下 null 是一个合法的"加载中"状态，消费者要自己
 *    处理它，不能用会抛错的 hook。
 */
const BookDetailContext = createContext<IBookInfo | null>(null);

export function useBookDetailContext(): IBookInfo {
  const book = useContext(BookDetailContext);
  if (!book) {
    throw new Error('useBookDetailContext must be used within <BookDetailContext.Provider> once data is ready');
  }
  return book;
}

export default BookDetailContext;
