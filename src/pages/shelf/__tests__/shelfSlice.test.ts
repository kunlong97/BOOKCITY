import { IBookInfo } from '@/types/book';
import {
  clearSelectedBook,
  clearSelectedGroup,
  setEditMode,
  setGroupVisibleMode,
  setSelectedBook,
  setSelectedGroup,
  shelfReducer,
} from '../shelfSlice';

type ShelfState = ReturnType<typeof shelfReducer>;

const initialState: ShelfState = {
  editMode: false,
  selectedBook: [],
  selectedGroup: [],
  groupVisibleMode: false,
};

const createBook = (bookId: string, overrides: Partial<IBookInfo> = {}): IBookInfo => ({
  bookId,
  title: `书名${bookId}`,
  author: '作者',
  categoryName: '科幻',
  coverImg: `/cover/${bookId}.png`,
  desc: '简介',
  ...overrides,
});

const createState = (overrides: Partial<ShelfState> = {}): ShelfState => ({ ...initialState, ...overrides });

describe('shelfSlice', () => {
  it('返回初始状态', () => {
    expect(shelfReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('未知 action 不改变状态，并返回同一个引用', () => {
    const state = createState({ editMode: true });
    expect(shelfReducer(state, { type: 'unknown' })).toBe(state);
  });

  describe('setEditMode', () => {
    it('进入和退出编辑模式', () => {
      let state = shelfReducer(initialState, setEditMode(true));
      expect(state.editMode).toBe(true);

      state = shelfReducer(state, setEditMode(false));
      expect(state.editMode).toBe(false);
    });

    it('退出编辑模式时不会自动清空已选书籍', () => {
      const book = createBook('1');
      const state = shelfReducer(createState({ editMode: true, selectedBook: [book] }), setEditMode(false));
      expect(state.selectedBook).toEqual([book]);
    });
  });

  describe('setSelectedBook', () => {
    it('未选中的书籍会被添加', () => {
      const book = createBook('1');
      const state = shelfReducer(initialState, setSelectedBook(book));
      expect(state.selectedBook).toEqual([book]);
    });

    it('多本书按选中顺序追加', () => {
      let state = shelfReducer(initialState, setSelectedBook(createBook('1')));
      state = shelfReducer(state, setSelectedBook(createBook('2')));
      expect(state.selectedBook.map((b) => b.bookId)).toEqual(['1', '2']);
    });

    it('已选中的书籍再次选中会被取消', () => {
      const state = shelfReducer(
        createState({ selectedBook: [createBook('1'), createBook('2'), createBook('3')] }),
        setSelectedBook(createBook('2')),
      );
      expect(state.selectedBook.map((b) => b.bookId)).toEqual(['1', '3']);
    });

    it('按 bookId 判断是否为同一本书，其他字段不同也会被取消选中', () => {
      const state = shelfReducer(
        createState({ selectedBook: [createBook('1')] }),
        setSelectedBook(createBook('1', { title: '另一个标题' })),
      );
      expect(state.selectedBook).toEqual([]);
    });

    it('连续切换两次回到原状态', () => {
      const book = createBook('1');
      let state = shelfReducer(initialState, setSelectedBook(book));
      state = shelfReducer(state, setSelectedBook(book));
      expect(state).toEqual(initialState);
    });

    it('不修改原状态对象', () => {
      const prev = createState({ selectedBook: [createBook('1')] });
      const snapshot = JSON.parse(JSON.stringify(prev));

      const next = shelfReducer(prev, setSelectedBook(createBook('2')));

      expect(prev).toEqual(snapshot);
      expect(next).not.toBe(prev);
      expect(next.selectedBook).not.toBe(prev.selectedBook);
    });
  });

  describe('setSelectedGroup', () => {
    it('未选中的分组会被添加', () => {
      const state = shelfReducer(initialState, setSelectedGroup('科幻'));
      expect(state.selectedGroup).toEqual(['科幻']);
    });

    it('已选中的分组再次选中会被取消，其他分组顺序不变', () => {
      const state = shelfReducer(createState({ selectedGroup: ['科幻', '历史', '悬疑'] }), setSelectedGroup('历史'));
      expect(state.selectedGroup).toEqual(['科幻', '悬疑']);
    });

    it('不修改原状态对象', () => {
      const prev = createState({ selectedGroup: ['科幻'] });
      const next = shelfReducer(prev, setSelectedGroup('历史'));

      expect(prev.selectedGroup).toEqual(['科幻']);
      expect(next.selectedGroup).toEqual(['科幻', '历史']);
    });
  });

  describe('clearSelectedBook', () => {
    it('清空已选书籍，不影响已选分组和模式', () => {
      const state = shelfReducer(
        createState({ editMode: true, selectedBook: [createBook('1')], selectedGroup: ['科幻'] }),
        clearSelectedBook(),
      );
      expect(state).toEqual(createState({ editMode: true, selectedGroup: ['科幻'] }));
    });
  });

  describe('clearSelectedGroup', () => {
    it('清空已选分组，不影响已选书籍和模式', () => {
      const book = createBook('1');
      const state = shelfReducer(
        createState({ groupVisibleMode: true, selectedBook: [book], selectedGroup: ['科幻'] }),
        clearSelectedGroup(),
      );
      expect(state).toEqual(createState({ groupVisibleMode: true, selectedBook: [book] }));
    });
  });

  describe('setGroupVisibleMode', () => {
    it('打开和关闭分组模式', () => {
      let state = shelfReducer(initialState, setGroupVisibleMode(true));
      expect(state.groupVisibleMode).toBe(true);

      state = shelfReducer(state, setGroupVisibleMode(false));
      expect(state.groupVisibleMode).toBe(false);
    });
  });
});
