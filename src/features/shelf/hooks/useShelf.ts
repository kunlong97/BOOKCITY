import { useCallback } from 'react';
import useReadLocalStorage from '@/hooks/useReadLocalStorage';
import storage from '@/utils/storage';
import { IBookInfo } from '@/types/book';

const SHELF_KEY = 'shelf';
const GROUP_KEY = 'shelf-group';

/**
 * 书架数据是本地持久化的业务状态（localStorage），不是服务端数据——但它同样需要
 * "谁负责读、谁负责写、写完谁负责通知别人刷新"这几件事有一个统一的答案，跟前三次
 * 重构服务端数据请求时要解决的问题是同一类问题，只是数据源换成了 localStorage。
 *
 * 重构前这几件事分散在 utils/shelf.ts 的几个裸函数里，各自调用 storage.set 之后
 * 要不要 dispatch 'local-storage' 事件通知订阅方刷新，全靠写函数的人自己记得——
 * setShelf 就漏了这一步（见 toggle 的实现），这次把"写完必须通知"收进一个统一的
 * notify 里，写操作不可能再漏掉这一步。
 */
function notify(key: string) {
  window.dispatchEvent(new CustomEvent('local-storage', { detail: { key } }));
}

interface IUseShelfResult {
  books: IBookInfo[];
  groups: Record<string, IBookInfo[]>;
  isInShelf: (bookId: string) => boolean;
  toggle: (book: IBookInfo) => string;
  removeBooks: (books: IBookInfo[]) => void;
  removeGroups: (groupNames: string[]) => void;
  moveToGroup: (
    name: string,
    selectedBooks: IBookInfo[],
    selectedGroupNames: string[],
  ) => { movedBooks: IBookInfo[]; msg: string };
}

function useShelf(): IUseShelfResult {
  const books = useReadLocalStorage<IBookInfo[]>(SHELF_KEY) || [];
  const groups = useReadLocalStorage<Record<string, IBookInfo[]>>(GROUP_KEY) || {};

  // "在不在书架里"要把散装列表和所有分组都算进去——书架、分组本质上都是
  // "这本书在我的书架里"这同一个概念的两种存放方式，不是两件事。
  const isInShelf = useCallback(
    (bookId: string) => {
      if (books.some((b) => b.bookId === bookId)) return true;
      return Object.values(groups).some((group) => group.some((b) => b.bookId === bookId));
    },
    [books, groups],
  );

  const removeBooks = useCallback((toRemove: IBookInfo[]) => {
    const ids = new Set(toRemove.map((b) => b.bookId));
    const current: IBookInfo[] = storage.get(SHELF_KEY) || [];
    storage.set(
      SHELF_KEY,
      current.filter((b) => !ids.has(b.bookId)),
    );
    notify(SHELF_KEY);
  }, []);

  const removeGroups = useCallback((groupNames: string[]) => {
    const current: Record<string, IBookInfo[]> = storage.get(GROUP_KEY) || {};
    groupNames.forEach((name) => delete current[name]);
    storage.set(GROUP_KEY, current);
    notify(GROUP_KEY);
  }, []);

  const removeFromAllGroups = useCallback((bookId: string) => {
    const current: Record<string, IBookInfo[]> = storage.get(GROUP_KEY) || {};
    let changed = false;
    Object.keys(current).forEach((name) => {
      const before = current[name].length;
      current[name] = current[name].filter((b) => b.bookId !== bookId);
      if (current[name].length !== before) changed = true;
    });
    if (changed) {
      storage.set(GROUP_KEY, current);
      notify(GROUP_KEY);
    }
  }, []);

  /**
   * 重构前 setShelf 只检查散装列表：如果一本书已经在某个分组里、但不在散装列表里，
   * isShelf(book.bookId) 会返回 true（按钮初始显示"已加入"），但点击后 setShelf
   * 只会往散装列表里再插一份——书变成了"分组里也有、散装列表也有"的重复状态，
   * 而按钮本地的 shelfMode 还会被翻转成"未加入"，跟数据的真实状态对不上。
   * 这里让 toggle 和 isInShelf 用同一个"在不在书架"的定义：已经在（不管是散装还是
   * 分组里），点一下就是从它当前所在的地方移除；不在，就加进散装列表。
   */
  const toggle = useCallback(
    (book: IBookInfo): string => {
      if (isInShelf(book.bookId)) {
        removeBooks([book]);
        removeFromAllGroups(book.bookId);
        return 'Removed from the bookshelf';
      }
      const current: IBookInfo[] = storage.get(SHELF_KEY) || [];
      current.unshift(book);
      storage.set(SHELF_KEY, current);
      notify(SHELF_KEY);
      return 'Added to bookshelf';
    },
    [isInShelf, removeBooks, removeFromAllGroups],
  );

  const moveToGroup = useCallback(
    (name: string, selectedBooks: IBookInfo[], selectedGroupNames: string[]) => {
      if (!name?.trim()) {
        throw new Error('分组名称不能为空');
      }

      const current: Record<string, IBookInfo[]> = storage.get(GROUP_KEY) || {};
      const groupBooks: IBookInfo[] = [];
      const groupsToMerge = selectedGroupNames.filter((g) => g !== name);

      groupsToMerge.forEach((groupName) => {
        if (current[groupName]?.length > 0) {
          groupBooks.push(...current[groupName]);
        }
        delete current[groupName];
      });

      const allBooks = [...(current[name] || []), ...groupBooks, ...selectedBooks];
      const uniqueBooks = Array.from(new Map(allBooks.map((b) => [b.bookId, b])).values());
      current[name] = uniqueBooks;
      storage.set(GROUP_KEY, current);
      notify(GROUP_KEY);

      const allMovedBooks = [...groupBooks, ...selectedBooks];
      if (allMovedBooks.length > 0) {
        removeBooks(allMovedBooks);
      }

      return { movedBooks: allMovedBooks, msg: 'Added to group' };
    },
    [removeBooks],
  );

  return { books, groups, isInShelf, toggle, removeBooks, removeGroups, moveToGroup };
}

export default useShelf;
