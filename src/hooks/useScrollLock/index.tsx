import useIsomorphicLayoutEffect from "../useIsomorphicLayout";

/**
 * 页面滚动锁定 Hook
 * @param visible - 控制是否锁定滚动。true 时锁定，false 时解除锁定
 */
const useScrollLock = (visible: boolean) => {
  // 使用 useIsomorphicLayoutEffect 而非 useEffect
  // 原因：滚动锁定需要在 DOM 渲染后、浏览器绘制前同步执行
  // 避免页面先滚动再被锁定的视觉闪烁问题
  // 同时该 Hook 在服务端渲染(SSR)环境下会自动降级为 useEffect，避免报错
  useIsomorphicLayoutEffect(() => {
    // 当浮层不可见时，直接跳过，不执行任何 DOM 操作
    if (!visible) return;

    // 获取 <html> 根元素
    // 锁定 html 而非 body，是为了兼容 iOS Safari 等浏览器的滚动行为差异
    const el = document.getElementsByTagName('html')[0];

    // 保存锁定前的原始 overflow 值，避免覆盖父组件设置的样式
    const originalOverflow = el.style.overflow;

    // 设置 overflow: hidden 锁定页面滚动
    el.style.overflow = 'hidden';

    // 返回清理函数：组件卸载或 visible 变为 false 时自动执行
    return () => {
      // 恢复为原始 overflow 值，而非直接设为空字符串
      // 这样能避免破坏页面原有的滚动样式
      el.style.overflow = originalOverflow;
    };
  }, [visible]); // 依赖 visible 变化，visible 切换时自动锁定/解锁
};

export default useScrollLock;
