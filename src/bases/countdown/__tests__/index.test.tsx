import { act, render } from '@testing-library/react';
import Countdown from '..';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// 推进假定时器（同时推进 Date.now），并让 React 处理期间产生的状态更新
const advance = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

const textOf = (container: HTMLElement) => container.textContent;

describe('Countdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('初始渲染', () => {
    it('默认按 hh:mm:ss 显示剩余时间', () => {
      const { container } = render(<Countdown time={HOUR + 2 * MINUTE + 3 * SECOND} />);
      expect(textOf(container)).toBe('01:02:03');
    });

    it('按传入的 format 显示', () => {
      const { container } = render(<Countdown time={2 * MINUTE + 5 * SECOND} format="mm分ss秒" />);
      expect(textOf(container)).toBe('02分05秒');
    });

    it('每个时间单位渲染为一个数字节点，分隔符单独渲染，最后一项没有分隔符', () => {
      const { container } = render(<Countdown time={HOUR} />);

      const nums = container.querySelectorAll('.ygm-countdown-item-num');
      const symbols = container.querySelectorAll('.ygm-countdown-symbol');

      expect(Array.from(nums).map((n) => n.textContent)).toEqual(['01', '00', '00']);
      expect(Array.from(symbols).map((s) => s.textContent)).toEqual([':', ':']);
    });

    it('numberClassName 和 symbolClassName 会加到对应节点上', () => {
      const { container } = render(<Countdown time={HOUR} numberClassName="my-num" symbolClassName="my-symbol" />);

      expect(container.querySelectorAll('.ygm-countdown-item-num.my-num')).toHaveLength(3);
      expect(container.querySelectorAll('.ygm-countdown-symbol.my-symbol')).toHaveLength(2);
    });
  });

  describe('倒计时', () => {
    it('每秒更新一次', () => {
      const { container } = render(<Countdown time={3 * SECOND} />);
      expect(textOf(container)).toBe('00:00:03');

      advance(SECOND);
      expect(textOf(container)).toBe('00:00:02');

      advance(SECOND);
      expect(textOf(container)).toBe('00:00:01');
    });

    it('跨分钟、跨小时时正确借位', () => {
      const { container } = render(<Countdown time={HOUR + 1 * SECOND} />);
      expect(textOf(container)).toBe('01:00:01');

      advance(SECOND);
      expect(textOf(container)).toBe('01:00:00');

      advance(SECOND);
      expect(textOf(container)).toBe('00:59:59');
    });

    it('不足一秒的时间按秒向下取整显示', () => {
      const { container } = render(<Countdown time={2500} />);
      expect(textOf(container)).toBe('00:00:02');
    });
  });

  describe('结束', () => {
    it('结束后显示 endText，并应用 endTextClassName', () => {
      const { container, getByText } = render(
        <Countdown time={2 * SECOND} endText="活动已结束" endTextClassName="my-end" />,
      );

      advance(2 * SECOND);

      expect(textOf(container)).toBe('活动已结束');
      expect(getByText('活动已结束')).toHaveProperty('className', 'my-end');
    });

    it('结束后不再保留定时器', () => {
      render(<Countdown time={2 * SECOND} endText="end" />);

      advance(2 * SECOND);

      expect(jest.getTimerCount()).toBe(0);
    });

    it('time 为 0 时直接显示 endText', () => {
      const { container } = render(<Countdown time={0} endText="已结束" />);
      expect(textOf(container)).toBe('已结束');
      expect(jest.getTimerCount()).toBe(0);
    });

    it('time 为负数时同样视为已结束', () => {
      const { container } = render(<Countdown time={-5 * SECOND} endText="已结束" />);
      expect(textOf(container)).toBe('已结束');
    });
  });

  it('卸载时清除定时器', () => {
    const { unmount } = render(<Countdown time={HOUR} />);
    expect(jest.getTimerCount()).toBe(1);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('time 变化时按新的时长重新开始倒计时', () => {
    const { container, rerender } = render(<Countdown time={10 * SECOND} />);
    advance(3 * SECOND);
    expect(textOf(container)).toBe('00:00:07');

    rerender(<Countdown time={MINUTE} />);

    expect(textOf(container)).toBe('00:01:00');
    expect(jest.getTimerCount()).toBe(1);
  });
});
