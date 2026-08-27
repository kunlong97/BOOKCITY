import { TBookDetailDTO, TBookDetailVM } from './types';

/**
 * API 层的转换职责：把「过滤查询永远返回数组」这个 json-server 的实现细节，
 * 解包成调用方真正想要的「一本书」。
 */
function transformBookDetail(dto: TBookDetailDTO): TBookDetailVM {
  return dto[0];
}

const api = {
  getBook: (id: string) => `/book?bookId=${id}`,
  transformBookDetail,
};

export default api;
