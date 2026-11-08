import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_THEME_INDEX, THEME } from './componets/constants';

interface ChapterState {
  headerVisible: boolean;
  footerVisible: boolean;
  catalogVisible: boolean;
  footerProgressBarVisible: boolean;
  footerSettingBarVisible: boolean;
  nightTheme: boolean;
  theme: string;
  fontSzie: number;
}

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

const chapterSlice = createSlice({
  name: 'chapter',
  initialState,
  reducers: {
    // 切换顶部导航显示与隐藏
    setHeaderVisible: (state, action) => {
      state.headerVisible = action.payload;
    },

    // 切换底部导航显示与隐藏
    setFooterVisible: (state, action) => {
      state.footerVisible = action.payload;
    },

    // 切换目录框显示与隐藏
    setCatalogVisible: (state, action) => {
      state.catalogVisible = action.payload;
    },

    // 切换进度条的显示与隐藏
    setFooterProgressBarVisible: (state, action) => {
      state.footerProgressBarVisible = action.payload;
    },

    // 切换设置框的显示与隐藏
    setFooterSettingBarVisible: (state, action) => {
      state.footerSettingBarVisible = action.payload;
    },

    // 切换夜间与日间模式
    setNightTheme: (state, action) => {
      state.nightTheme = action.payload;
    },

    // 切换主题颜色
    setTheme: (state, action) => {
      state.theme = action.payload;
    },

    // 切换字号大小
    setFontSize: (state, action) => {
      state.fontSzie = action.payload;
    },
  },
});

export const {
  setHeaderVisible,
  setFooterVisible,
  setCatalogVisible,
  setFooterProgressBarVisible,
  setFooterSettingBarVisible,
  setNightTheme,
  setTheme,
  setFontSize,
} = chapterSlice.actions;
export const chapterReducer = chapterSlice.reducer;
