import { act, renderHook } from '@testing-library/react';
import { IBookInfo } from '@/types/book';
import useShelf from '../useShelf';

const SHELF_KEY = 'shelf';
const GROUP_KEY = 'shelf-group';

const createBook = (bookId: string): IBookInfo => ({
  bookId,
  title: `书名${bookId}`,
  author: '作者',
  categoryName: '分类',
  coverImg: `/cover/${bookId}.png`,
  desc: '简介',
});

const A = createBook('a');
const B = createBook('b');
const C = createBook('c');

const seedShelf = (books: IBookInfo[]) => localStorage.setItem(SHELF_KEY, JSON.stringify(books));
const seedGroups = (groups: Record<string, IBookInfo[]>) => localStorage.setItem(GROUP_KEY, JSON.stringify(groups));
const readShelf = (): IBookInfo[] => JSON.parse(localStorage.getItem(SHELF_KEY) || 'null');
const readGroups = (): Record<string, IBookInfo[]> => JSON.parse(localStorage.getItem(GROUP_KEY) || 'null');
const ids = (books: IBookInfo[]) => books.map((b) => b.bookId);

describe('useShelf', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('读取', () => {
    it('没有数据时 books 为 []，groups 为 {}', () => {
      const { result } = renderHook(() => useShelf());
      expect(result.current.books).toEqual([]);
      expect(result.current.groups).toEqual({});
    });

    it('读取已有的书架和分组', () => {
      seedShelf([A]);
      seedGroups({ 科幻: [B] });

      const { result } = renderHook(() => useShelf());

      expect(result.current.books).toEqual([A]);
      expect(result.current.groups).toEqual({ 科幻: [B] });
    });
  });

  describe('isInShelf', () => {
    it('书在散装列表或任一分组里都算在书架中', () => {
      seedShelf([A]);
      seedGroups({ 科幻: [B] });

      const { result } = renderHook(() => useShelf());

      expect(result.current.isInShelf('a')).toBe(true);
      expect(result.current.isInShelf('b')).toBe(true);
      expect(result.current.isInShelf('c')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('不在书架中时加入散装列表的最前面', () => {
      seedShelf([A]);
      const { result } = renderHook(() => useShelf());

      let msg = '';
      act(() => {
        msg = result.current.toggle(B);
      });

      expect(msg).toBe('Added to bookshelf');
      expect(ids(readShelf())).toEqual(['b', 'a']);
      expect(ids(result.current.books)).toEqual(['b', 'a']);
      expect(result.current.isInShelf('b')).toBe(true);
    });

    it('已在散装列表中时移除', () => {
      seedShelf([A, B]);
      const { result } = renderHook(() => useShelf());

      let msg = '';
      act(() => {
        msg = result.current.toggle(A);
      });

      expect(msg).toBe('Removed from the bookshelf');
      expect(ids(result.current.books)).toEqual(['b']);
      expect(result.current.isInShelf('a')).toBe(false);
    });

    it('书只在分组里时从分组中移除，不会重复加入散装列表', () => {
      seedShelf([]);
      seedGroups({ 科幻: [A, B], 历史: [A] });
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.toggle(A);
      });

      expect(result.current.books).toEqual([]);
      expect(result.current.groups).toEqual({ 科幻: [B], 历史: [] });
      expect(result.current.isInShelf('a')).toBe(false);
    });

    it('连续切换两次回到原状态', () => {
      seedShelf([A]);
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.toggle(B);
      });
      act(() => {
        result.current.toggle(B);
      });

      expect(ids(result.current.books)).toEqual(['a']);
    });
  });

  describe('removeBooks', () => {
    it('按 bookId 批量移除散装列表中的书', () => {
      seedShelf([A, B, C]);
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.removeBooks([A, C]);
      });

      expect(ids(readShelf())).toEqual(['b']);
      expect(ids(result.current.books)).toEqual(['b']);
    });

    it('移除不在书架中的书时列表不变', () => {
      seedShelf([A]);
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.removeBooks([C]);
      });

      expect(ids(result.current.books)).toEqual(['a']);
    });

    it('不影响分组', () => {
      seedShelf([A]);
      seedGroups({ 科幻: [A] });
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.removeBooks([A]);
      });

      expect(result.current.groups).toEqual({ 科幻: [A] });
    });
  });

  describe('removeGroups', () => {
    it('删除指定分组，保留其他分组', () => {
      seedGroups({ 科幻: [A], 历史: [B], 悬疑: [C] });
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.removeGroups(['科幻', '悬疑']);
      });

      expect(readGroups()).toEqual({ 历史: [B] });
      expect(result.current.groups).toEqual({ 历史: [B] });
    });

    it('删除分组时其中的书也一起离开书架', () => {
      seedGroups({ 科幻: [A] });
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.removeGroups(['科幻']);
      });

      expect(result.current.isInShelf('a')).toBe(false);
    });
  });

  describe('moveToGroup', () => {
    it('把散装列表中选中的书移入新分组', () => {
      seedShelf([A, B, C]);
      const { result } = renderHook(() => useShelf());

      let ret: ReturnType<typeof result.current.moveToGroup> | undefined;
      act(() => {
        ret = result.current.moveToGroup('科幻', [A, B], []);
      });

      expect(ret).toEqual({ movedBooks: [A, B], msg: '已添加至分组' });
      expect(result.current.groups).toEqual({ 科幻: [A, B] });
      expect(ids(result.current.books)).toEqual(['c']);
    });

    it('移入已有分组时追加在原有书籍之后', () => {
      seedShelf([B]);
      seedGroups({ 科幻: [A] });
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.moveToGroup('科幻', [B], []);
      });

      expect(ids(result.current.groups['科幻'])).toEqual(['a', 'b']);
    });

    it('选中的其他分组会合并进目标分组，原分组被删除', () => {
      seedShelf([C]);
      seedGroups({ 科幻: [A], 历史: [B], 悬疑: [createBook('d')] });
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.moveToGroup('科幻', [C], ['历史']);
      });

      expect(Object.keys(result.current.groups).sort()).toEqual(['悬疑', '科幻'].sort());
      expect(ids(result.current.groups['科幻'])).toEqual(['a', 'b', 'c']);
      expect(result.current.books).toEqual([]);
    });

    it('选中的分组里包含目标分组本身时不会把它删掉', () => {
      seedShelf([B]);
      seedGroups({ 科幻: [A] });
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.moveToGroup('科幻', [B], ['科幻']);
      });

      expect(ids(result.current.groups['科幻'])).toEqual(['a', 'b']);
    });

    it('同一本书出现多次时按 bookId 去重', () => {
      seedShelf([A]);
      seedGroups({ 科幻: [A], 历史: [A, B] });
      const { result } = renderHook(() => useShelf());

      act(() => {
        result.current.moveToGroup('科幻', [A], ['历史']);
      });

      expect(ids(result.current.groups['科幻'])).toEqual(['a', 'b']);
    });

    it('没有选中任何书和分组时创建一个空分组', () => {
      const { result } = renderHook(() => useShelf());

      let ret: ReturnType<typeof result.current.moveToGroup> | undefined;
      act(() => {
        ret = result.current.moveToGroup('新分组', [], []);
      });

      expect(ret?.movedBooks).toEqual([]);
      expect(result.current.groups).toEqual({ 新分组: [] });
    });

    it.each(['', '   '])('分组名称为 "%s" 时抛出异常，且不修改数据', (name) => {
      seedShelf([A]);
      const { result } = renderHook(() => useShelf());

      expect(() => result.current.moveToGroup(name, [A], [])).toThrow('分组名称不能为空');
      expect(readGroups()).toBeNull();
      expect(ids(readShelf())).toEqual(['a']);
    });
  });

  it('多个组件使用 useShelf 时，一处修改其他处同步更新', () => {
    const { result: detailFooter } = renderHook(() => useShelf());
    const { result: shelfList } = renderHook(() => useShelf());

    act(() => {
      detailFooter.current.toggle(A);
    });

    expect(ids(shelfList.current.books)).toEqual(['a']);
    expect(shelfList.current.isInShelf('a')).toBe(true);
  });
});
