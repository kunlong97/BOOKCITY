/**
 * 整页跳转（浏览器重新加载页面），不经过 React Router。
 * 单独放一个模块，是为了测试时可以用 jest.mock 替换：jsdom 不支持真正的页面跳转，
 * 而且从 jsdom 26（Jest 30）开始 window.location 也不能再被整个替换掉。
 */
export const hardNavigate = (url: string) => {
  window.location.assign(url);
};
