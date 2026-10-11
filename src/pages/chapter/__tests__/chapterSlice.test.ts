import { configureStore } from '@reduxjs/toolkit';
import {
  chapterReducer,
  setCatalogVisible,
  setFontSize,
  setFooterProgressBarVisible,
  setFooterSettingBarVisible,
  setFooterVisible,
  setHeaderVisible,
  setNightTheme,
  setTheme,
} from '../chapterSlice';
import { DEFAULT_THEME_INDEX, THEME } from '../componets/constants';

type ChapterState = ReturnType<typeof chapterReducer>;

const initialState: ChapterState = {
  headerVisible: false,
  footerVisible: false,
  catalogVisible: false,
  footerProgressBarVisible: false,
  footerSettingBarVisible: false,
  nightTheme: false,
  theme: THEME[DEFAULT_THEME_INDEX],
  fontSzie: 18,
};

describe('chapterSlice', () => {
  it('返回初始状态：所有面板隐藏、日间模式、默认主题、18 号字', () => {
    expect(chapterReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('未知 action 不改变状态，并返回同一个引用', () => {
    const state = { ...initialState, headerVisible: true };
    expect(chapterReducer(state, { type: 'unknown' })).toBe(state);
  });

  // 各个布尔开关的 reducer 结构相同，统一用 it.each 覆盖
  describe.each([
    ['setHeaderVisible', setHeaderVisible, 'headerVisible'],
    ['setFooterVisible', setFooterVisible, 'footerVisible'],
    ['setCatalogVisible', setCatalogVisible, 'catalogVisible'],
    ['setFooterProgressBarVisible', setFooterProgressBarVisible, 'footerProgressBarVisible'],
    ['setFooterSettingBarVisible', setFooterSettingBarVisible, 'footerSettingBarVisible'],
    ['setNightTheme', setNightTheme, 'nightTheme'],
  ] as const)('%s', (_name, actionCreator, field) => {
    it(`设为 true 时只修改 ${field}`, () => {
      const state = chapterReducer(initialState, actionCreator(true));
      expect(state).toEqual({ ...initialState, [field]: true });
    });

    it('设为 false 时恢复隐藏/关闭', () => {
      const state = chapterReducer({ ...initialState, [field]: true }, actionCreator(false));
      expect(state[field]).toBe(false);
    });

    it('不修改原状态对象', () => {
      const prev = { ...initialState };
      const next = chapterReducer(prev, actionCreator(true));
      expect(prev).toEqual(initialState);
      expect(next).not.toBe(prev);
    });
  });

  describe('setTheme', () => {
    it.each(THEME)('切换到主题色 %s', (color) => {
      const state = chapterReducer(initialState, setTheme(color));
      expect(state).toEqual({ ...initialState, theme: color });
    });

    it('切换主题不影响夜间模式开关', () => {
      const state = chapterReducer({ ...initialState, nightTheme: true }, setTheme(THEME[1]));
      expect(state.nightTheme).toBe(true);
    });
  });

  describe('setFontSize', () => {
    it('修改字号，只影响 fontSzie 字段', () => {
      const state = chapterReducer(initialState, setFontSize(24));
      expect(state).toEqual({ ...initialState, fontSzie: 24 });
    });

    it.each([14, 28])('可以设置为滑块边界值 %i', (size) => {
      expect(chapterReducer(initialState, setFontSize(size)).fontSzie).toBe(size);
    });
  });

  it('接入 store 后模拟设置面板“切换主题”：设置主题并关闭夜间模式', () => {
    const store = configureStore({ reducer: { Chapter: chapterReducer } });

    store.dispatch(setNightTheme(true));
    expect(store.getState().Chapter.nightTheme).toBe(true);

    // 与 settingBar 中 onSetTheme 的 dispatch 顺序一致
    store.dispatch(setTheme(THEME[2]));
    store.dispatch(setNightTheme(false));

    expect(store.getState().Chapter).toEqual({ ...initialState, theme: THEME[2] });
  });
});
