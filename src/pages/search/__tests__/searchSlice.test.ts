import { configureStore } from '@reduxjs/toolkit';
import { searchReducer, setSearchKeyword, setSearchMode } from '../searchSlice';

const initialState = { searchKeyword: '', searchMode: false };

describe('searchSlice', () => {
  it('返回初始状态', () => {
    expect(searchReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('未知 action 不改变状态，并返回同一个引用', () => {
    const state = { searchKeyword: '三体', searchMode: true };
    expect(searchReducer(state, { type: 'unknown' })).toBe(state);
  });

  describe('action creators', () => {
    it('setSearchKeyword 生成正确的 action', () => {
      expect(setSearchKeyword('三体')).toEqual({ type: 'search/setSearchKeyword', payload: '三体' });
    });

    it('setSearchMode 生成正确的 action', () => {
      expect(setSearchMode(true)).toEqual({ type: 'search/setSearchMode', payload: true });
    });
  });

  describe('setSearchKeyword', () => {
    it('设置搜索关键词，不影响 searchMode', () => {
      const state = searchReducer({ searchKeyword: '', searchMode: true }, setSearchKeyword('三体'));
      expect(state).toEqual({ searchKeyword: '三体', searchMode: true });
    });

    it('可以把关键词清空', () => {
      const state = searchReducer({ searchKeyword: '三体', searchMode: false }, setSearchKeyword(''));
      expect(state.searchKeyword).toBe('');
    });

    it('不修改原状态对象', () => {
      const prev = { ...initialState };
      const next = searchReducer(prev, setSearchKeyword('三体'));

      expect(prev).toEqual(initialState);
      expect(next).not.toBe(prev);
    });
  });

  describe('setSearchMode', () => {
    it('进入搜索模式，不影响 searchKeyword', () => {
      const state = searchReducer({ searchKeyword: '三体', searchMode: false }, setSearchMode(true));
      expect(state).toEqual({ searchKeyword: '三体', searchMode: true });
    });

    it('退出搜索模式', () => {
      const state = searchReducer({ searchKeyword: '', searchMode: true }, setSearchMode(false));
      expect(state.searchMode).toBe(false);
    });

    it('不修改原状态对象', () => {
      const prev = { ...initialState };
      const next = searchReducer(prev, setSearchMode(true));

      expect(prev).toEqual(initialState);
      expect(next).not.toBe(prev);
    });
  });

  it('接入 store 后按 dispatch 顺序更新状态', () => {
    const store = configureStore({ reducer: { Search: searchReducer } });

    store.dispatch(setSearchKeyword('三体'));
    store.dispatch(setSearchMode(true));
    expect(store.getState().Search).toEqual({ searchKeyword: '三体', searchMode: true });

    // 模拟搜索栏点击清除图标（onClear）：清空关键词并退出搜索模式
    store.dispatch(setSearchKeyword(''));
    store.dispatch(setSearchMode(false));
    expect(store.getState().Search).toEqual(initialState);
  });
});
