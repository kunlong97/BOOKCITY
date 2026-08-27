import { IBookInfo } from '@/types/book';
import { createSlice } from '@reduxjs/toolkit';

interface ShelfState {
  editMode: boolean;
  selectedBook: IBookInfo[];
  selectedGroup: string[];
  groupVisibleMode: boolean;
}

const initialState: ShelfState = {
  editMode: false,
  selectedBook: [],
  selectedGroup: [],
  groupVisibleMode: false,
};

const shelfSlice = createSlice({
  name: 'shelf',
  initialState,
  reducers: {
    // 切换编辑模式
    setEditMode: (state, action) => {
      state.editMode = action.payload;
    },

    // 切换书籍选中状态
    setSelectedBook: (state, action) => {
      const index = state.selectedBook.findIndex((book) => book.bookId === action.payload.bookId);

      // 书籍未选中：直接“添加”
      if (index === -1) {
        state.selectedBook.push(action.payload);

        // 书籍已选中：直接“删除”
      } else {
        state.selectedBook.splice(index, 1);
      }
    },

    //切换分组选中状态
    setSelectedGroup: (state, action) => {
      const groupName = action.payload;
      const index = state.selectedGroup.indexOf(groupName);

      //直接"添加"
      if (index === -1) {
        state.selectedGroup.push(groupName);

        //直接"删除"
      } else {
        state.selectedGroup.splice(index, 1);
      }
    },

    //清空选中的书籍
    clearSelectedBook: (state) => {
      state.selectedBook = [];
    },

    //清空选中的分组
    clearSelectedGroup: (state) => {
      state.selectedGroup = [];
    },

    //切换分组编辑模式
    setGroupVisibleMode: (state, action) => {
      state.groupVisibleMode = action.payload;
    },
  },
});

export const {
  setEditMode,
  setSelectedBook,
  setSelectedGroup,
  clearSelectedBook,
  clearSelectedGroup,
  setGroupVisibleMode,
} = shelfSlice.actions;
export const shelfReducer = shelfSlice.reducer;
