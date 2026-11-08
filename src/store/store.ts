import { shelfReducer } from "@/pages/shelf/shelfSlice";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { chapterReducer } from "@/pages/chapter/chapterSlice";
import { searchReducer } from "@/pages/search/searchSlice";

// 单独导出 rootReducer，测试里新建 store 时复用同一份，preloadedState 的类型也由它推导
export const rootReducer = combineReducers({
  Shelf: shelfReducer,
  Chapter: chapterReducer,
  Search: searchReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
