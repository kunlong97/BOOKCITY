import { act, renderHook } from '@testing-library/react';
import useLockFn from '..';

// 创建一个可以在测试中手动 resolve / reject 的 Promise
const createDeferred = <T = void>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useLockFn', () => {
  it('透传参数并返回原函数的结果', async () => {
    const fn = jest.fn(async (a: number, b: number) => a + b);
    const { result } = renderHook(() => useLockFn(fn));

    await expect(result.current(1, 2)).resolves.toBe(3);
    expect(fn).toHaveBeenCalledWith(1, 2);
  });

  it('上一次调用未结束时，后续调用被忽略并返回 undefined', async () => {
    const deferred = createDeferred<string>();
    const fn = jest.fn(() => deferred.promise);
    const { result } = renderHook(() => useLockFn(fn));

    const first = result.current();
    const second = result.current();
    const third = result.current();

    await expect(second).resolves.toBeUndefined();
    await expect(third).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);

    deferred.resolve('done');
    await expect(first).resolves.toBe('done');
  });

  it('上一次调用成功结束后会解锁，可以再次调用', async () => {
    const fn = jest.fn(async () => 'ok');
    const { result } = renderHook(() => useLockFn(fn));

    await result.current();
    await result.current();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('原函数抛出异常时，异常会向外抛出，并且会解锁', async () => {
    const error = new Error('load failed');
    const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('retry ok');
    const { result } = renderHook(() => useLockFn(fn));

    await expect(result.current()).rejects.toBe(error);
    await expect(result.current()).resolves.toBe('retry ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('pending 期间被忽略的调用不会在解锁后补执行', async () => {
    const deferred = createDeferred();
    const fn = jest.fn(() => deferred.promise);
    const { result } = renderHook(() => useLockFn(fn));

    const first = result.current();
    result.current();

    deferred.resolve();
    await first;

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('fn 不变时，重新渲染返回同一个函数引用', () => {
    const fn = async () => undefined;
    const { result, rerender } = renderHook(() => useLockFn(fn));
    const firstRef = result.current;

    rerender();

    expect(result.current).toBe(firstRef);
  });

  it('fn 变化后锁状态仍然保留（锁存放在 ref 中）', async () => {
    // 对应 InfiniteScroll 中 useLockFn(() => props.loadMore()) 每次渲染都传入新函数的场景
    const deferred = createDeferred();
    const fnA = jest.fn(() => deferred.promise);
    const fnB = jest.fn(async () => undefined);

    const { result, rerender } = renderHook(({ fn }) => useLockFn(fn), {
      initialProps: { fn: fnA as () => Promise<unknown> },
    });

    const first = result.current();
    rerender({ fn: fnB });

    // fnA 还没结束，新返回的函数也处于锁定状态
    await act(async () => {
      await result.current();
    });
    expect(fnB).not.toHaveBeenCalled();

    deferred.resolve();
    await first;

    await result.current();
    expect(fnB).toHaveBeenCalledTimes(1);
  });

  it('不同组件实例之间的锁互不影响', async () => {
    const deferred = createDeferred();
    const fn = jest.fn(() => deferred.promise);

    const { result: a } = renderHook(() => useLockFn(fn));
    const { result: b } = renderHook(() => useLockFn(fn));

    a.current();
    b.current();

    expect(fn).toHaveBeenCalledTimes(2);
    deferred.resolve();
  });
});
