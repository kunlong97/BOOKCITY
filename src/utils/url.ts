/**
 * 把查询参数转成字符串，和之前用的 query-string 保持一致：
 * 按 key 字母序排列；空格编码成 %20（URLSearchParams 默认编码成 +，值里真正的 + 会被编码成 %2B，所以这里替换是安全的）
 */
const toQueryString = (qs: URLSearchParams) => {
  qs.sort();
  return qs.toString().replace(/\+/g, '%20');
};

// 设置或更新 URL 中的查询参数，用 replaceState 更新地址，页面不会跳转
export const setUrlParams = (params: [string, string][], basePath = '/') => {
  if (!Array.isArray(params) || params.length === 0) return;
  const qs = new URLSearchParams(window.location.search);
  params.forEach(([key, value]) => {
    qs.set(key, value);
  });
  window.history.replaceState(null, '', `${basePath}?${toQueryString(qs)}`);
};

// 删除 URL 中指定的查询参数，全部删完时不留下 ?
export const removeUrlParams = (params: string[], basePath = '/') => {
  if (!Array.isArray(params) || params.length === 0) return;
  const qs = new URLSearchParams(window.location.search);
  params.forEach((key) => {
    qs.delete(key);
  });
  const str = toQueryString(qs);
  window.history.replaceState(null, '', str ? `${basePath}?${str}` : basePath);
};
