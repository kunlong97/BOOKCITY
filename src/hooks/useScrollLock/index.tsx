import useIsomorphicLayoutEffect from '../useIsomorphicLayout';

/**
 * 全局的锁定计数。
 * Popup 和它内部的 Mask 会同时调用 useScrollLock，页面上也可能同时打开多个浮层。
 * 如果每个调用方各自保存、各自恢复 overflow，后锁定的一方保存到的"原始值"其实是
 * 前一方设置的 'hidden'，关闭顺序一乱就会把页面永久恢复成 'hidden'。
 * 所以这里统一计数：只有第一个锁定时保存原始值，最后一个解除时才恢复。
 */
let lockCount = 0;
let originalOverflow = '';

// 锁定 html 而非 body，是为了兼容 iOS Safari 等浏览器的滚动行为差异
const getLockTarget = () => document.documentElement;

const lock = () => {
  if (lockCount === 0) {
    const el = getLockTarget();
    // 保存锁定前的原始 overflow 值，避免覆盖页面原有的样式
    originalOverflow = el.style.overflow;
    el.style.overflow = 'hidden';
  }
  lockCount += 1;
};

const unlock = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    getLockTarget().style.overflow = originalOverflow;
  }
};

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

    lock();

    // 返回清理函数：组件卸载或 visible 变为 false 时自动执行
    return () => {
      unlock();
    };
  }, [visible]); // 依赖 visible 变化，visible 切换时自动锁定/解锁
};

export default useScrollLock;
