import { TTtileKeyMap } from '@/pages/bookList/types';

export const TITLE_KEY_MAP: TTtileKeyMap = {
  '001': 'Mystery & Thriller',
  '002': 'Science & Fantasy',
  '003': 'History',
  '004': 'Romance',
  '005': 'Horror',
  '006': 'Literature',
  'finish': 'Completed',
  // "推荐"入口目前没有对应的 mock 数据（api-now/db.json 里没有 bookList_recommend），
  // 这里只补标题是为了满足 TTtileKeyMap = Record<TPageKey, string> 的类型要求，
  // 不代表这个入口已经可用——点进去仍然会因为接口 404 走 error 分支，
  // 是有意保留的、还没实现的状态，不是漏改。
  'recommend': 'Recommended',
  'hotpicks': 'Hot Picks',
  'todaypicks':'Today\'s Picks'
};
