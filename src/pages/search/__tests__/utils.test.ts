import { HISTORY_SEARCH_KEY } from '../constants';
import { clearHistory, deleteHistory, setHistory } from '../utils';

const readHistory = (): string[] | null => {
  const json = localStorage.getItem(HISTORY_SEARCH_KEY);
  return json ? JSON.parse(json) : null;
};

const writeHistory = (list: string[]) => {
  localStorage.setItem(HISTORY_SEARCH_KEY, JSON.stringify(list));
};

describe('search history utils', () => {
  let eventListener: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    eventListener = jest.fn();
    window.addEventListener('local-storage', eventListener);
  });

  afterEach(() => {
    window.removeEventListener('local-storage', eventListener);
  });

  // 断言派发了一次 local-storage 事件，且 detail.key 为搜索历史的 key
  const expectStorageEventDispatched = () => {
    expect(eventListener).toHaveBeenCalledTimes(1);
    const event = eventListener.mock.calls[0][0] as CustomEvent;
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.detail).toEqual({ key: HISTORY_SEARCH_KEY });
  };

  describe('setHistory', () => {
    it('历史为空时新增一条记录', () => {
      setHistory('三体');
      expect(readHistory()).toEqual(['三体']);
    });

    it('新记录插入到最前面', () => {
      writeHistory(['a', 'b']);
      setHistory('c');
      expect(readHistory()).toEqual(['c', 'a', 'b']);
    });

    it('已存在的记录会去重并移到最前面', () => {
      writeHistory(['a', 'b', 'c']);
      setHistory('b');
      expect(readHistory()).toEqual(['b', 'a', 'c']);
    });

    it('重复搜索最前面的记录时顺序不变', () => {
      writeHistory(['a', 'b']);
      setHistory('a');
      expect(readHistory()).toEqual(['a', 'b']);
    });

    it('写入后派发 local-storage 事件', () => {
      setHistory('三体');
      expectStorageEventDispatched();
    });

    it('空字符串不保存，也不派发事件', () => {
      writeHistory(['a']);
      setHistory('');
      expect(readHistory()).toEqual(['a']);
      expect(eventListener).not.toHaveBeenCalled();
    });
  });

  describe('deleteHistory', () => {
    it('删除指定记录，其他记录顺序不变', () => {
      writeHistory(['a', 'b', 'c']);
      deleteHistory('b');
      expect(readHistory()).toEqual(['a', 'c']);
    });

    it('删除不存在的记录时列表不变', () => {
      writeHistory(['a', 'b']);
      deleteHistory('x');
      expect(readHistory()).toEqual(['a', 'b']);
    });

    it('历史为空时删除会写入空数组', () => {
      deleteHistory('a');
      expect(readHistory()).toEqual([]);
    });

    it('删除后派发 local-storage 事件', () => {
      writeHistory(['a']);
      deleteHistory('a');
      expectStorageEventDispatched();
    });
  });

  describe('clearHistory', () => {
    it('清空搜索历史', () => {
      writeHistory(['a', 'b']);
      clearHistory();
      expect(localStorage.getItem(HISTORY_SEARCH_KEY)).toBeNull();
    });

    it('不影响 localStorage 中的其他数据', () => {
      writeHistory(['a']);
      localStorage.setItem('other', '1');
      clearHistory();
      expect(localStorage.getItem('other')).toBe('1');
    });

    it('清空后派发 local-storage 事件', () => {
      clearHistory();
      expectStorageEventDispatched();
    });
  });
});
