import { act } from '@testing-library/react';

/**
 * jsdom 没有 IntersectionObserver / ResizeObserver，这里提供全局的假实现（在 setup.ts 里安装）。
 * 它们不会自动触发回调，由测试调用 setIntersecting / triggerResize 手动控制。
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  elements: Element[] = [];

  constructor(private callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve(element: Element) {
    this.elements = this.elements.filter((el) => el !== element);
  }

  disconnect() {
    this.elements = [];
  }

  takeRecords() {
    return [];
  }

  trigger(isIntersecting: boolean, match: (element: Element) => boolean) {
    const entries = this.elements
      .filter(match)
      .map((target) => ({ isIntersecting, target }) as IntersectionObserverEntry);

    if (entries.length > 0) {
      this.callback(entries, this as unknown as IntersectionObserver);
    }
  }
}

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  elements: Element[] = [];

  constructor(private callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve(element: Element) {
    this.elements = this.elements.filter((el) => el !== element);
  }

  disconnect() {
    this.elements = [];
  }

  trigger() {
    if (this.elements.length > 0) {
      this.callback([], this as unknown as ResizeObserver);
    }
  }
}

export const installObservers = () => {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
};

export const resetObservers = () => {
  MockIntersectionObserver.instances = [];
  MockResizeObserver.instances = [];
};

/**
 * 模拟元素进入或离开可视区域。
 * 不传 target 时作用于所有被观察的元素（比如让页面上所有懒加载图片一次性加载）。
 */
export const setIntersecting = (isIntersecting: boolean, target?: Element) => {
  act(() => {
    MockIntersectionObserver.instances.forEach((observer) => {
      observer.trigger(isIntersecting, (element) => !target || element === target);
    });
  });
};

// 模拟所有被观察元素的尺寸发生变化
export const triggerResize = () => {
  act(() => {
    MockResizeObserver.instances.forEach((observer) => observer.trigger());
  });
};
