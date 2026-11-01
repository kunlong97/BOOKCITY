import { act, render, screen } from '@testing-library/react';
import Toast from '..';
import ToastComponent from '../toast';

const toastsInBody = () => document.body.querySelectorAll('.ygm-toast');

describe('Toast 组件', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('自动关闭', () => {
    it('默认 2 秒后调用 unmount', () => {
      const unmount = jest.fn();
      render(<ToastComponent content="提示" unmount={unmount} />);

      jest.advanceTimersByTime(1999);
      expect(unmount).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(unmount).toHaveBeenCalledTimes(1);
    });

    it('按传入的 duration 关闭', () => {
      const unmount = jest.fn();
      render(<ToastComponent content="提示" duration={500} unmount={unmount} />);

      jest.advanceTimersByTime(499);
      expect(unmount).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(unmount).toHaveBeenCalledTimes(1);
    });

    it('提前卸载时清除定时器，不会再调用 unmount', () => {
      const unmount = jest.fn();
      const { unmount: unmountComponent } = render(<ToastComponent content="提示" unmount={unmount} />);

      unmountComponent();
      jest.advanceTimersByTime(5000);

      expect(unmount).not.toHaveBeenCalled();
    });

    it('组件卸载时调用 afterClose', () => {
      const afterClose = jest.fn();
      const { unmount } = render(<ToastComponent content="提示" afterClose={afterClose} />);
      expect(afterClose).not.toHaveBeenCalled();

      unmount();

      expect(afterClose).toHaveBeenCalledTimes(1);
    });

    it('显示期间传入新的 afterClose，不会提前触发，卸载时调用最新的', () => {
      const oldAfterClose = jest.fn();
      const newAfterClose = jest.fn();
      const { rerender, unmount } = render(<ToastComponent content="提示" afterClose={oldAfterClose} />);

      rerender(<ToastComponent content="提示" afterClose={newAfterClose} />);
      expect(oldAfterClose).not.toHaveBeenCalled();
      expect(newAfterClose).not.toHaveBeenCalled();

      unmount();

      expect(oldAfterClose).not.toHaveBeenCalled();
      expect(newAfterClose).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Toast.show', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // 清理还没关闭的 Toast，避免影响后续测试
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('传入字符串时显示该文本', () => {
    act(() => {
      Toast.show('Added to bookshelf');
    });

    expect(toastsInBody()).toHaveLength(1);
    expect(screen.getByText('Added to bookshelf')).toBeTruthy();
  });


  it('到期后从页面移除，并清理挂载的容器节点', () => {
    const childCountBefore = document.body.childElementCount;

    act(() => {
      Toast.show('提示');
    });
    expect(document.body.childElementCount).toBe(childCountBefore + 1);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(toastsInBody()).toHaveLength(0);
    expect(document.body.childElementCount).toBe(childCountBefore);
  });

  it('按传入的 duration 移除', () => {
    act(() => {
      Toast.show({ content: '提示', duration: 500 });
    });

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(toastsInBody()).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(toastsInBody()).toHaveLength(0);
  });

  it('移除后调用 afterClose', () => {
    const afterClose = jest.fn();

    act(() => {
      Toast.show({ content: '提示', afterClose });
    });
    expect(afterClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(afterClose).toHaveBeenCalledTimes(1);
  });

  describe('连续调用', () => {
    it('新的 Toast 替换上一条，同一时间只显示一条', () => {
      act(() => {
        Toast.show('第一条');
      });
      act(() => {
        Toast.show('第二条');
      });

      expect(toastsInBody()).toHaveLength(1);
      expect(screen.queryByText('第一条')).toBeNull();
      expect(screen.getByText('第二条')).toBeTruthy();
    });

    it('上一条被替换时调用它的 afterClose', () => {
      const afterClose = jest.fn();

      act(() => {
        Toast.show({ content: '第一条', afterClose });
      });
      act(() => {
        Toast.show('第二条');
      });

      expect(afterClose).toHaveBeenCalledTimes(1);
    });

    it('上一条的定时器不会影响新的 Toast，新的按自己的 duration 关闭', () => {
      act(() => {
        Toast.show({ content: '第一条', duration: 1000 });
      });
      act(() => {
        Toast.show({ content: '第二条', duration: 3000 });
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('第二条')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(toastsInBody()).toHaveLength(0);
    });

    it('同一轮事件里连续调用，也只留下最后一条', () => {
      act(() => {
        Toast.show('第一条');
        Toast.show('第二条');
        Toast.show('第三条');
      });

      expect(toastsInBody()).toHaveLength(1);
      expect(screen.getByText('第三条')).toBeTruthy();
    });

    it('上一条自动关闭后，再次调用能正常显示', () => {
      const childCountBefore = document.body.childElementCount;

      act(() => {
        Toast.show('第一条');
      });
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      act(() => {
        Toast.show('第二条');
      });

      expect(screen.getByText('第二条')).toBeTruthy();
      expect(document.body.childElementCount).toBe(childCountBefore + 1);
    });
  });
});
