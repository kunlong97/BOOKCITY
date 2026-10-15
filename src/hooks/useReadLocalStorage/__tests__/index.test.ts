import { act, renderHook } from '@testing-library/react';
import useReadLocalStorage from '..';
import { HISTORY_SEARCH_KEY } from '@/pages/search/constants';
import { clearHistory, deleteHistory, setHistory } from '@/pages/search/utils';

const KEY = 'test_key';

const dispatchStorageEvent = (detail: Record<string, unknown>) => {
  window.dispatchEvent(new CustomEvent('local-storage', { detail }));
};

describe('useReadLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('初始读取', () => {
    it('读取并反序列化已有数据', () => {
      localStorage.setItem(KEY, JSON.stringify({ a: 1 }));
      const { result } = renderHook(() => useReadLocalStorage<{ a: number }>(KEY));
      expect(result.current).toEqual({ a: 1 });
    });

    it('key 不存在时返回 null', () => {
      const { result } = renderHook(() => useReadLocalStorage(KEY));
      expect(result.current).toBeNull();
    });

  describe('监听 local-storage 事件', () => {
    it('收到当前 key 的事件后重新读取', () => {
      const { result } = renderHook(() => useReadLocalStorage<string[]>(KEY));

      localStorage.setItem(KEY, JSON.stringify(['a']));
      dispatchStorageEvent({ key: KEY });

      expect(result.current).toEqual(['a']);
    });

    it('收到其他 key 的事件时不更新', () => {
      localStorage.setItem(KEY, JSON.stringify('old'));
      const { result } = renderHook(() => useReadLocalStorage<string>(KEY));

      localStorage.setItem(KEY, JSON.stringify('new'));
      dispatchStorageEvent({ key: 'other_key' });

      expect(result.current).toBe('old');
    });

    it('数据被删除后收到事件变为 null', () => {
      localStorage.setItem(KEY, JSON.stringify('value'));
      const { result } = renderHook(() => useReadLocalStorage<string>(KEY));

      localStorage.removeItem(KEY);
      dispatchStorageEvent({ key: KEY });

      expect(result.current).toBeNull();
    });

    it('没有收到事件时，直接修改 localStorage 不会更新', () => {
      const { result } = renderHook(() => useReadLocalStorage<string>(KEY));
     
      localStorage.setItem(KEY, JSON.stringify('new'));
     
      expect(result.current).toBeNull();
    });
  });

  // 与搜索历史工具函数配合：工具函数写入并派发事件，hook 自动刷新
  describe('配合搜索历史工具函数', () => {
    it('setHistory / deleteHistory / clearHistory 后 hook 自动更新', () => {
      const { result } = renderHook(() => useReadLocalStorage<string[]>(HISTORY_SEARCH_KEY));
      expect(result.current).toBeNull();

      act(() => setHistory('三体'));
      expect(result.current).toEqual(['三体']);

      act(() => deleteHistory('三体'));
      expect(result.current).toEqual(['球状闪电']);

      act(() => clearHistory());
      expect(result.current).toBeNull();
    });
  });
});
