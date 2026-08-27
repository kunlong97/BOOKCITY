import { parse, stringify } from 'query-string'; 

export const setUrlParams = (params: [string, string][], basePath = '/') => {
  //设置或更新 URL 中的查询参数
  if (!Array.isArray(params) || params.length === 0) return;
  const qs = parse(window.location.search); //在JavaScript中，window.location.search属性用于获取URL中的查询字符串，即问号?后面的部分.parse()将其转换成对象
  params.forEach((param) => {
    qs[param[0]] = param[1]; //外层[]是动态给qs对象的属性赋值
  });
  window.history.replaceState(null, '', `${basePath}?${stringify(qs)}`);
  //window.history.replaceState()更新页面URL,但页面不会跳转.它替换的是 URL 中问号（?）及其后面的所有内容，也就是所谓的查询字符串部分
};

export const removeUrlParams = (params: string[], basePath = '/') => {
  //删除url中的keyword
  if (!Array.isArray(params) || params.length === 0) return;
  const qs = parse(window.location.search);
  params.forEach((param) => {
    delete qs[param];
  });
  const str = stringify(qs);
  window.history.replaceState(null, '', str ? `${basePath}?${str}` : basePath);
};
