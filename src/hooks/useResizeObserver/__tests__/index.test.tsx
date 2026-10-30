import { useRef } from 'react';
import { render } from '@testing-library/react';
import useResizeObserver from '..';

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  observed: Element[] = [];
  disconnected = false;

  constructor(public callback: () => void) {
    MockResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }
}

const Target = ({ onResize }: { onResize: (el: HTMLDivElement) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useResizeObserver(onResize, ref);
  return <div ref={ref} data-testid="target" />;
};

describe('useResizeObserver', () => {
  const original = window.ResizeObserver;

  afterEach(() => {
    window.ResizeObserver = original;
  });

  describe('浏览器支持 ResizeObserver', () => {
    beforeEach(() => {
      MockResizeObserver.instances = [];
      window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    });

    it('监听目标元素，尺寸变化时用该元素调用回调', () => {
      const onResize = jest.fn();
      const { getByTestId } = render(<Target onResize={onResize} />);
      const [observer] = MockResizeObserver.instances;

      expect(observer.observed).toEqual([getByTestId('target')]);
      expect(onResize).not.toHaveBeenCalled();

      observer.callback();

      expect(onResize).toHaveBeenCalledWith(getByTestId('target'));
    });

    it('回调变化后，触发的是最新的回调，且不会重新创建观察器', () => {
      const oldCallback = jest.fn();
      const newCallback = jest.fn();
      const { rerender } = render(<Target onResize={oldCallback} />);

      rerender(<Target onResize={newCallback} />);
      MockResizeObserver.instances[0].callback();

      expect(MockResizeObserver.instances).toHaveLength(1);
      expect(oldCallback).not.toHaveBeenCalled();
      expect(newCallback).toHaveBeenCalledTimes(1);
    });

    it('卸载时断开观察器', () => {
      const { unmount } = render(<Target onResize={jest.fn()} />);

      unmount();

      expect(MockResizeObserver.instances[0].disconnected).toBe(true);
    });
  });

  it('浏览器不支持 ResizeObserver 时，挂载后执行一次回调', () => {
    window.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    const onResize = jest.fn();

    render(<Target onResize={onResize} />);

    expect(onResize).toHaveBeenCalledTimes(1);
  });
});
