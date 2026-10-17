import { IBookInfo } from '@/types/book';

/**
 * 接口原始返回的单本书结构（DTO）。
 * mock 数据里 categoryName 并不是每条都有（参见 api-now/db.json 的 bookList_001），
 * 但全局的 IBookInfo 把 categoryName 标成了必填——两者不一致，是「未做 DTO/VM 区分」的典型后果。
 * 这里显式把它标为可选，让类型如实反映接口真实返回的数据形状。
 */
export interface IBookItemDTO extends Omit<IBookInfo, 'categoryName'> {
  categoryName?: string;
}

export interface IBookListDTO {
  bookList: IBookItemDTO[];
  isLast: boolean; //是否是最后一条数据
}

/**
 * 经过 API 层 transform 之后的视图模型（VM）。
 * categoryName 在这一层已经被兜底过，页面层可以放心当作必有值来渲染，不需要再关心缺失的情况。
 */
export interface IBookListVM {
  bookList: IBookInfo[];
  isLast: boolean;
}

export type TPageKey =
  | '001'
  | '002'
  | '003'
  | '004'
  | '005'
  | '006'
  | 'finish'
  | 'recommend'
  | 'hotpicks'
  | 'todaypicks'

export type TTtileKeyMap = Record<TPageKey, string>;
