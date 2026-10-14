import { renderHook } from '@testing-library/react';
import useDebouncedCallback from '..';

const DELAY = 300;

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('延迟 delay 毫秒后才执行，并透传参数', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, DELAY));
    const [debounced] = result.current;

    debounced('三体', 1);

    jest.advanceTimersByTime(DELAY - 1);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('三体', 1);
  });

  it('每次调用都会重新计时', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, DELAY));
    const [debounced] = result.current;

    debounced('a');
    jest.advanceTimersByTime(DELAY - 1);
    debounced('b');
    jest.advanceTimersByTime(DELAY - 1);

    // 距离第一次调用已超过 delay，但距离最后一次还没到
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledWith('b');
  });

  describe('cancel', () => {
    it('取消还没触发的调用', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, DELAY));
      const [debounced, cancel] = result.current;

      debounced('a');
      cancel();
      jest.advanceTimersByTime(DELAY * 2);

      expect(callback).not.toHaveBeenCalled();
    });

    it('没有待执行的调用时取消不报错', () => {
      const { result } = renderHook(() => useDebouncedCallback(jest.fn(), DELAY));
      const [, cancel] = result.current;

      expect(() => cancel()).not.toThrow();
    });

    it('已经触发过之后再取消不影响结果', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, DELAY));
      const [debounced, cancel] = result.current;

      debounced('a');
      jest.advanceTimersByTime(DELAY);
      cancel();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('取消后再次调用可以正常执行', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, DELAY));
      const [debounced, cancel] = result.current;

      debounced('a');
      cancel();
      debounced('b');
      jest.advanceTimersByTime(DELAY);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('b');
    });
  });

  it('组件卸载时清除还没触发的定时器', () => {
    const callback = jest.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, DELAY));
    const [debounced] = result.current;

    debounced('a');
    unmount();
    jest.advanceTimersByTime(DELAY);

    expect(callback).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });


  it('等待期间 callback 变化，触发时调用最新的 callback，且不打断计时', () => {
    const oldCallback = jest.fn();
    const newCallback = jest.fn();
    const { result, rerender } = renderHook(({ cb }) => useDebouncedCallback(cb, DELAY), {
      initialProps: { cb: oldCallback as (value: string) => void },
    });

    result.current[0]('a');
    jest.advanceTimersByTime(DELAY - 100);

    rerender({ cb: newCallback });

    // 只需再等剩下的 100ms，说明重新渲染没有重置定时器
    jest.advanceTimersByTime(100);
  
    expect(oldCallback).not.toHaveBeenCalled();
    expect(newCallback).toHaveBeenCalledWith('a');
  });

  it('delay 变化后返回新的函数，并使用新的延迟时间', () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(({ delay }) => useDebouncedCallback(callback, delay), {
      initialProps: { delay: DELAY },
    });
    const [oldDebounced] = result.current;

    rerender({ delay: 1000 });
    const [newDebounced] = result.current;
    expect(newDebounced).not.toBe(oldDebounced);

    newDebounced('a');
    jest.advanceTimersByTime(DELAY);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000 - DELAY);
    expect(callback).toHaveBeenCalledWith('a');
  });
});
