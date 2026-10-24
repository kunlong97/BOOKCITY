import { act, render, screen } from '@testing-library/react';
import InfiniteScroll from '..';

/**
 * jsdom 没有 IntersectionObserver，这里用一个可控的假实现代替：
 * 测试里调用 setIntersecting(true/false) 模拟底部"哨兵"元素进入/离开可视区域。
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  elements: Element[] = [];
  disconnected = false;

  constructor(public callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  takeRecords() {
    return [];
  }
}

const setIntersecting = (isIntersecting: boolean) => {
  act(() => {
    MockIntersectionObserver.instances
      .filter((ob) => !ob.disconnected)
      .forEach((ob) =>
        ob.callback(
          ob.elements.map((target) => ({ isIntersecting, target }) as IntersectionObserverEntry),
          ob as unknown as IntersectionObserver,
        ),
      );
  });
};

// 创建一个可以在测试中手动 resolve 的 Promise
const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('InfiniteScroll', () => {
  const originalIO = window.IntersectionObserver;

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    window.IntersectionObserver = originalIO;
  });

  describe('渲染', () => {
    it('渲染子元素', () => {
      render(
        <InfiniteScroll hasMore loadMore={jest.fn().mockResolvedValue(undefined)}>
          <div>书籍列表</div>
        </InfiniteScroll>,
      );

      expect(screen.getByText('书籍列表')).toBeTruthy();
    });

    it('还有更多时底部显示加载动画', () => {
      const { container } = render(
        <InfiniteScroll hasMore loadMore={jest.fn().mockResolvedValue(undefined)}>
          <div />
        </InfiniteScroll>,
      );

      expect(container.querySelector('.ygm-spinner-loading')).not.toBeNull();
    });

    it('没有更多时底部不显示加载动画', () => {
      const { container } = render(
        <InfiniteScroll hasMore={false} loadMore={jest.fn().mockResolvedValue(undefined)}>
          <div />
        </InfiniteScroll>,
      );

      expect(container.querySelector('.ygm-spinner-loading')).toBeNull();
    });

    it('传入 footer 时显示自定义底部，替代加载动画', () => {
      const { container } = render(
        <InfiniteScroll hasMore loadMore={jest.fn().mockResolvedValue(undefined)} footer={<span>没有更多了</span>}>
          <div />
        </InfiniteScroll>,
      );

      expect(screen.getByText('没有更多了')).toBeTruthy();
      expect(container.querySelector('.ygm-spinner-loading')).toBeNull();
    });
  });

  describe('触发加载', () => {
    it('底部元素不在可视区域时不加载', () => {
      const loadMore = jest.fn().mockResolvedValue(undefined);
      render(
        <InfiniteScroll hasMore loadMore={loadMore}>
          <div />
        </InfiniteScroll>,
      );

      setIntersecting(false);

      expect(loadMore).not.toHaveBeenCalled();
    });

    it('底部元素进入可视区域且还有更多时调用 loadMore', () => {
      const loadMore = jest.fn().mockResolvedValue(undefined);
      render(
        <InfiniteScroll hasMore loadMore={loadMore}>
          <div />
        </InfiniteScroll>,
      );

      setIntersecting(true);

      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it('没有更多时即使进入可视区域也不加载', () => {
      const loadMore = jest.fn().mockResolvedValue(undefined);
      render(
        <InfiniteScroll hasMore={false} loadMore={loadMore}>
          <div />
        </InfiniteScroll>,
      );

      setIntersecting(true);

      expect(loadMore).not.toHaveBeenCalled();
    });

    it('观察的是列表底部的元素', () => {
      const { container } = render(
        <InfiniteScroll hasMore loadMore={jest.fn().mockResolvedValue(undefined)}>
          <div>书籍列表</div>
        </InfiniteScroll>,
      );

      const root = container.firstElementChild!;
      expect(MockIntersectionObserver.instances[0].elements).toEqual([root.lastElementChild]);
    });
  });

  describe('防重复加载', () => {
    it('上一次加载未完成时，重新渲染不会再次调用 loadMore', () => {
      const deferred = createDeferred();
      const loadMore = jest.fn(() => deferred.promise);

      const { rerender } = render(
        <InfiniteScroll hasMore loadMore={loadMore}>
          <div>第 1 页</div>
        </InfiniteScroll>,
      );
      setIntersecting(true);

      rerender(
        <InfiniteScroll hasMore loadMore={loadMore}>
          <div>第 1 页（重新渲染）</div>
        </InfiniteScroll>,
      );

      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it('加载完成后变为没有更多，不再继续加载', async () => {
      const loadMore = jest.fn().mockResolvedValue(undefined);

      const { rerender } = render(
        <InfiniteScroll hasMore loadMore={loadMore}>
          <div />
        </InfiniteScroll>,
      );
      setIntersecting(true);
      await act(async () => {});

      rerender(
        <InfiniteScroll hasMore={false} loadMore={loadMore}>
          <div />
        </InfiniteScroll>,
      );

      expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });

  it('卸载时断开 IntersectionObserver', () => {
    const { unmount } = render(
      <InfiniteScroll hasMore loadMore={jest.fn().mockResolvedValue(undefined)}>
        <div />
      </InfiniteScroll>,
    );

    unmount();

    expect(MockIntersectionObserver.instances.every((ob) => ob.disconnected)).toBe(true);
  });
});
