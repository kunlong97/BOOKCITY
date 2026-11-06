/**
 * json-server 中间件：给书单接口（/bookList_xxx）加上真正的分页。
 *
 * json-server 本身会忽略 pageIndex，每一页都返回整份数据；而 db.json 里大部分书单的 isLast 又是 false，
 * 页面会无限加载同样的书，没法写无限滚动的用例。这里把书单按 PAGE_SIZE 切页，最后一页 isLast 为 true。
 * 只在 E2E 里使用，日常开发的 json-server 不受影响。
 */
const path = require('path');

const PAGE_SIZE = 4;
const db = require(path.resolve(__dirname, 'db.json'));

module.exports = (req, res, next) => {
  const match = req.method === 'GET' && /^\/(bookList_\w+)$/.exec(req.path);
  const list = match && db[match[1]];
  if (!list || !Array.isArray(list.bookList)) return next();

  const pageIndex = Math.max(1, Number(req.query.pageIndex) || 1);
  const start = (pageIndex - 1) * PAGE_SIZE;

  res.json({
    bookList: list.bookList.slice(start, start + PAGE_SIZE),
    isLast: start + PAGE_SIZE >= list.bookList.length,
  });
};
