interface Window {
  /** index.html 里提前发出的首页数据请求（只在访问首页时存在），由 useHomeData 接管后清空 */
  __HOME_DATA__?: Promise<unknown>;
}
