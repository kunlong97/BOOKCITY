import useIsomorphicLayoutEffect from '../useIsomorphicLayout';

/**
 * 自定义 Hook：监听指定 DOM 元素的尺寸变化
 * @template T - 必须是 HTMLElement 或其子类型，确保类型安全
 * @param callback - 元素尺寸变化时触发的回调函数，接收当前元素作为参数
 * @param targetRef - React ref 对象，指向需要监听的 DOM 元素
 */
const useResizeObserver = <T extends HTMLElement>(callback: (target: T) => void, targetRef: React.RefObject<T>) => {
  useIsomorphicLayoutEffect(() => {
    // 使用 layout effect 确保在 DOM 布局完成后(浏览器绘制之前)执行，避免闪烁

    const element = targetRef.current;
    if (!element) return;

    //检查浏览器是否原生支持 ResizeObserver API
    if (window.ResizeObserver) {  
      
      const observer = new ResizeObserver(() => {
        callback(element);
      });
      observer.observe(element); //开始监听目标元素
      return () => {
        // 组件卸载或依赖变化时，断开观察以释放资源，防止内存泄漏
        observer.disconnect();
      };
    }

    //降级方案：不支持 ResizeObserver 时，初始化时手动执行一次回调
    callback(element);
    return () => null;
  }, []);
};

export default useResizeObserver;
