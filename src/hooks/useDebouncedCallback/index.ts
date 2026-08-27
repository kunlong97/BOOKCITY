import { useCallback, useEffect, useRef } from 'react';

/**
 * 返回一个防抖后的函数和一个手动取消函数。
 * callback 存在 ref 里、每次渲染都更新——防抖真正触发时永远调用最新的那一份，
 * 不会因为把 callback 放进 useCallback 依赖数组而导致"每次渲染都生成一个新的
 * 防抖函数、定时器被无意打断"这种常见的防抖 hook 坑。
 * 返回的 cancel 用于"用户主动做了别的操作，之前那次还没触发的防抖搜索应该作废"
 * 的场景（比如清空输入框、或者直接按了回车）。
 */
function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): readonly [(...args: Args) => void, () => void] {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => cancel, [cancel]); // 组件卸载时清理掉还没触发的定时器

  const debounced = useCallback(
    (...args: Args) => {
      cancel();
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [cancel, delay]
  );

  return [debounced, cancel] as const;
}

export default useDebouncedCallback;
