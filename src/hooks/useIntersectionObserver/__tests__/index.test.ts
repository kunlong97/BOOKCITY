import { act, renderHook } from '@testing-library/react';
import useIntersectionObserver, { Options } from '..';

// jsdom 没有 IntersectionObserver，用一个可控的假实现代替
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  observed: Element[] = [];
  disconnected = false;

  constructor(public callback: IntersectionObserverCallback, public options: IntersectionObserverInit) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  takeRecords() {
    return [];
  }

  // 模拟元素进入或离开可视区域
  trigger(isIntersecting: boolean) {
    const entry = { isIntersecting, target: this.observed[0] } as IntersectionObserverEntry;
    act(() => {
      this.callback([entry], this as unknown as IntersectionObserver);
    });
  }
}

const observers = () => MockIntersectionObserver.instances;
const activeObservers = () => observers().filter((ob) => !ob.disconnected);

const setup = (options: Options = {}) => {
  const element = document.createElement('div');
  const ref = { current: element };
  const utils = renderHook(({ opts }) => useIntersectionObserver(ref, opts), { initialProps: { opts: options } });
  return { ...utils, element };
};

describe('useIntersectionObserver', () => {
  const originalIO = window.IntersectionObserver;

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    window.IntersectionObserver = originalIO;
  });

  describe('创建观察器', () => {
    it('观察目标元素', () => {
      const { element } = setup();

      expect(observers()).toHaveLength(1);
      expect(observers()[0].observed).toEqual([element]);
    });

    it('默认配置：threshold 0、root null、rootMargin 0%', () => {
      setup();

      expect(observers()[0].options).toEqual({ threshold: 0, root: null, rootMargin: '0%' });
    });

    it('传入的配置会交给观察器，freezeOnceVisible 不算观察器的配置', () => {
      const root = document.createElement('div');

      setup({ threshold: 0.5, root, rootMargin: '10px', freezeOnceVisible: true });

      expect(observers()[0].options).toEqual({ threshold: 0.5, root, rootMargin: '10px' });
    });

    it('ref 没有指向元素时不创建观察器', () => {
      const { result } = renderHook(() => useIntersectionObserver({ current: null }, {}));

      expect(observers()).toHaveLength(0);
      expect(result.current).toBeUndefined();
    });
  });

  describe('返回 entry', () => {
    it('还没有回调时返回 undefined', () => {
      const { result } = setup();
      expect(result.current).toBeUndefined();
    });

    it('进入和离开可视区域时更新 entry', () => {
      const { result, element } = setup();
      const [observer] = observers();

      observer.trigger(true);
      expect(result.current?.isIntersecting).toBe(true);
      expect(result.current?.target).toBe(element);

      observer.trigger(false);
      expect(result.current?.isIntersecting).toBe(false);
    });
  });

  describe('freezeOnceVisible', () => {
    it('未开启时，进入可视区域后继续观察', () => {
      setup();

      observers()[0].trigger(true);

      expect(activeObservers()).toHaveLength(1);
    });

    it('开启后，进入可视区域就断开观察，且不再创建新的观察器', () => {
      const { result } = setup({ freezeOnceVisible: true });

      observers()[0].trigger(true);

      expect(observers()[0].disconnected).toBe(true);
      expect(activeObservers()).toHaveLength(0);
      expect(result.current?.isIntersecting).toBe(true);
    });

    it('开启后，元素一直不在可视区域时继续观察', () => {
      setup({ freezeOnceVisible: true });

      observers()[0].trigger(false);

      expect(activeObservers()).toHaveLength(1);
    });

    it('冻结后 entry 保持可见状态，重新渲染也不会恢复观察', () => {
      const { result, rerender } = setup({ freezeOnceVisible: true });
      observers()[0].trigger(true);

      rerender({ opts: { freezeOnceVisible: true } });

      expect(result.current?.isIntersecting).toBe(true);
      expect(activeObservers()).toHaveLength(0);
    });
  });

  describe('生命周期', () => {
    it('卸载时断开观察器', () => {
      const { unmount } = setup();

      unmount();

      expect(observers()[0].disconnected).toBe(true);
    });

    it('配置不变时，重新渲染不会重建观察器', () => {
      const { rerender } = setup({ threshold: 0.5 });

      rerender({ opts: { threshold: 0.5 } });

      expect(observers()).toHaveLength(1);
    });

    it('配置变化时，断开旧的观察器并创建新的', () => {
      const { rerender } = setup({ threshold: 0 });

      rerender({ opts: { threshold: 1 } });

      expect(observers()).toHaveLength(2);
      expect(observers()[0].disconnected).toBe(true);
      expect(observers()[1].options.threshold).toBe(1);
      expect(activeObservers()).toHaveLength(1);
    });
  });
});
