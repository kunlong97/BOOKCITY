import { IBookInfo } from '@/types/book';

/**
 * json-server 对 `/book?bookId=xxx` 这种过滤查询，返回的永远是数组（命中 0 条或 1 条），
 * 这是接口真实的返回形状（DTO）。
 */
export type TBookDetailDTO = IBookInfo[];

/**
 * 视图模型：不管是详情页还是阅读页，业务上关心的都是"这一本书"，不是"一个数组"，
 * 解包这件事只应该做一次，写在这一个模块里。
 */
export type TBookDetailVM = IBookInfo | undefined;
