import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SearchState {
  searchKeyword: string;
  searchMode: boolean;
}

const initialState: SearchState = {
  searchKeyword: '',
  searchMode: false,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchKeyword: (state, action: PayloadAction<string>) => {
      state.searchKeyword = action.payload;
    },
    setSearchMode: (state, action: PayloadAction<boolean>) => {
      state.searchMode = action.payload;
    },
  },
});

export const { setSearchKeyword, setSearchMode } = searchSlice.actions;
export const searchReducer = searchSlice.reducer;
