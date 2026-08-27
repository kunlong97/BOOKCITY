import { shelfReducer } from "@/pages/shelf/shelfSlice";
import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { chapterReducer } from "@/pages/chapter/chapterSlice";
import { searchReducer } from "@/pages/search/searchSlice";

const store = configureStore({
  reducer:{
    Shelf: shelfReducer,
    Chapter:chapterReducer,
    Search: searchReducer,
  }
})

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;