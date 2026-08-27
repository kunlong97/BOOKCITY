import { IBookListDTO, IBookListVM, TPageKey } from './types';

const DEFAULT_CATEGORY_NAME = 'Uncategorized';

/**
 * API 层的数据转换职责：把接口原始形状（DTO）加工成页面可以直接渲染的视图模型（VM）。
 * 目前唯一的加工逻辑是给缺失的 categoryName 兜底默认值——重构前页面直接渲染
 * `${book.author}·${book.categoryName}`，遇到没有 categoryName 的数据会显示成
 * "xxx·undefined"，是一个真实存在、此前没被处理过的展示 bug。
 */
function transformBookListPage(dto: IBookListDTO): IBookListVM {
  return {
    isLast: dto.isLast,
    bookList: dto.bookList.map((book) => ({
      ...book,
      categoryName: book.categoryName || DEFAULT_CATEGORY_NAME,
    })),
  };
}

const api = {
  getBookList: (key: TPageKey) => `/bookList_${key}`,
  transformBookListPage,
};

export default api;