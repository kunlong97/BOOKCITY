import { act, fireEvent, render, screen } from '@testing-library/react';
import Swiper, { SwiperProps } from '..';

const TRACK_WIDTH = 300;

const renderSwiper = (props: Partial<SwiperProps> = {}, count = 3) => {
  const utils = render(
    <Swiper {...props}>
      {Array.from({ length: count }, (_, i) => (
        <Swiper.Item key={i}>
          <div>第 {i + 1} 张</div>
        </Swiper.Item>
      ))}
    </Swiper>,
  );

  // jsdom 不做布局，给轨道设置一个宽度，用来计算滑动比例
  const track = utils.container.querySelector('.ygm-swiper-track') as HTMLElement;
  Object.defineProperty(track, 'offsetWidth', { configurable: true, value: TRACK_WIDTH });

  return { ...utils, track };
};

const getSlides = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.ygm-swiper-slide')) as HTMLElement[];

/**
 * 当前显示的是第几张：每张 slide 的 translate 百分比 = (index - currentIndex) * 100，
 * 位于 0% 的那张就是当前显示的
 */
const getCurrentIndex = (container: HTMLElement) =>
  getSlides(container).findIndex((slide) => slide.style.transform === 'translate3d(0%, 0, 0)');

const getActiveDot = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.ygm-swiper-page-indicator-dot')).findIndex((dot) =>
    dot.classList.contains('ygm-swiper-page-indicator-dot-active'),
  );

// 模拟手指从 fromX 滑到 toX：touchstart 绑定在轨道上，touchmove / touchend 监听在 document 上
const swipe = (track: HTMLElement, fromX: number, toX: number) => {
  fireEvent.touchStart(track, { changedTouches: [{ clientX: fromX }] });
  fireEvent.touchMove(document, { changedTouches: [{ clientX: toX }] });
  fireEvent.touchEnd(document, { changedTouches: [{ clientX: toX }] });
};

describe('Swiper', () => {
  describe('渲染', () => {
    it('渲染所有轮播项，默认显示第 1 张', () => {
      const { container } = renderSwiper();

      expect(getSlides(container)).toHaveLength(3);
      expect(screen.getByText('第 3 张')).toBeTruthy();
      expect(getCurrentIndex(container)).toBe(0);
    });

    it('每张 slide 按下标横向排开', () => {
      const { container } = renderSwiper();

      expect(getSlides(container).map((s) => s.style.transform)).toEqual([
        'translate3d(0%, 0, 0)',
        'translate3d(100%, 0, 0)',
        'translate3d(200%, 0, 0)',
      ]);
    });

    it('defaultIndex 指定初始显示的那一张', () => {
      const { container } = renderSwiper({ defaultIndex: 2 });
      expect(getCurrentIndex(container)).toBe(2);
    });

    it('style 中的 CSS 变量加到最外层容器上', () => {
      const { container } = renderSwiper({ style: { '--height': '200px' } });

      const root = container.querySelector('.ygm-swiper') as HTMLElement;
      expect(root.style.getPropertyValue('--height')).toBe('200px');
    });

    it('子元素不是 Swiper.Item 时给出警告', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      render(
        <Swiper>
          <div>不是 Swiper.Item</div>
        </Swiper>,
      );

      expect(warn).toHaveBeenCalledWith('Swiper children must be Swiper.Item components');
      warn.mockRestore();
    });
  });

  describe('指示器', () => {
    it('默认显示指示器，圆点数量等于轮播项数量，当前项高亮', () => {
      const { container } = renderSwiper({ defaultIndex: 1 });

      expect(container.querySelectorAll('.ygm-swiper-page-indicator-dot')).toHaveLength(3);
      expect(getActiveDot(container)).toBe(1);
    });

    it('showIndicator 为 false 时不显示指示器', () => {
      const { container } = renderSwiper({ showIndicator: false });
      expect(container.querySelector('.ygm-swiper-indicator')).toBeNull();
    });
  });

  describe('手指滑动', () => {
    it('滑动过程中 slide 跟随手指移动', () => {
      const { container, track } = renderSwiper();

      fireEvent.touchStart(track, { changedTouches: [{ clientX: 200 }] });
      // 向左滑 30px，占轨道宽度的 10%
      fireEvent.touchMove(document, { changedTouches: [{ clientX: 170 }] });

      expect(getSlides(container)[0].style.transform).toBe('translate3d(-10%, 0, 0)');

      fireEvent.touchEnd(document);
    });

    it('向左滑动超过一半，切换到下一张', () => {
      const { container, track } = renderSwiper();

      swipe(track, 250, 70); // 向左 180px = 60%

      expect(getCurrentIndex(container)).toBe(1);
      expect(getActiveDot(container)).toBe(1);
    });

    it('向右滑动超过一半，切换到上一张', () => {
      const { container, track } = renderSwiper({ defaultIndex: 2 });

      swipe(track, 50, 230); // 向右 180px = 60%

      expect(getCurrentIndex(container)).toBe(1);
    });

    it('滑动不到一半，回到当前这张', () => {
      const { container, track } = renderSwiper();

      swipe(track, 250, 160); // 向左 90px = 30%

      expect(getCurrentIndex(container)).toBe(0);
    });

    it('一次滑动超过一屏时，按滑动距离跨多张切换', () => {
      const { container, track } = renderSwiper({}, 4);

      fireEvent.touchStart(track, { changedTouches: [{ clientX: 700 }] });
      fireEvent.touchMove(document, { changedTouches: [{ clientX: 100 }] }); // 600px = 2 屏
      fireEvent.touchEnd(document);

      expect(getCurrentIndex(container)).toBe(2);
    });

    it('松手后移除 document 上的监听，之后的 touchmove 不再影响轮播', () => {
      const { container, track } = renderSwiper();

      swipe(track, 250, 70);
      fireEvent.touchMove(document, { changedTouches: [{ clientX: -1000 }] });

      expect(getCurrentIndex(container)).toBe(1);
    });
  });

  describe('自动播放', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('默认不自动播放', () => {
      const { container } = renderSwiper();

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(getCurrentIndex(container)).toBe(0);
    });

    it('autoplay 时按默认间隔 2 秒切换到下一张', () => {
      const { container } = renderSwiper({ autoplay: true });

      act(() => {
        jest.advanceTimersByTime(1999);
      });
      expect(getCurrentIndex(container)).toBe(0);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(getCurrentIndex(container)).toBe(1);
      expect(getActiveDot(container)).toBe(1);
    });

    it('autoPlayInterval 自定义切换间隔', () => {
      const { container } = renderSwiper({ autoplay: true, autoPlayInterval: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(getCurrentIndex(container)).toBe(1);

      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(getCurrentIndex(container)).toBe(2);
    });

    it('卸载时清除定时器', () => {
      const { unmount } = renderSwiper({ autoplay: true });

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('未开启 loop 时，播放到最后一张后停住', () => {
      const { container } = renderSwiper({ autoplay: true });

      // 每个间隔单独推进，让 React 在两次切换之间完成渲染（和浏览器里一致）
      for (let i = 0; i < 5; i += 1) {
        act(() => {
          jest.advanceTimersByTime(2000);
        });
      }

      expect(getCurrentIndex(container)).toBe(2);
    });

    it('开启 loop 时，播放到最后一张后回到第一张，循环往复', () => {
      const { container } = renderSwiper({ autoplay: true, loop: true });

      const sequence: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        act(() => {
          jest.advanceTimersByTime(2000);
        });
        sequence.push(getCurrentIndex(container));
      }

      expect(sequence).toEqual([1, 2, 0, 1, 2]);
      expect(getActiveDot(container)).toBe(2);
    });

    it('手指拖动期间暂停自动播放，松手后恢复', () => {
      const { container, track } = renderSwiper({ autoplay: true });

      fireEvent.touchStart(track, { changedTouches: [{ clientX: 200 }] });
      fireEvent.touchMove(document, { changedTouches: [{ clientX: 170 }] });

      // 拖动中经过了好几个播放间隔，轮播图仍然跟着手指，不会自动跳走
      act(() => {
        jest.advanceTimersByTime(2000 * 3);
      });
      expect(getSlides(container)[0].style.transform).toBe('translate3d(-10%, 0, 0)');

      // 松手（滑动不到一半，回到第 1 张），之后自动播放恢复
      fireEvent.touchEnd(document);
      expect(getCurrentIndex(container)).toBe(0);

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(getCurrentIndex(container)).toBe(1);
    });
  });

  describe('loop 时手指滑动', () => {
    it('在最后一张继续向左滑，回到第一张', () => {
      const { container, track } = renderSwiper({ loop: true, defaultIndex: 2 });

      swipe(track, 250, 70);

      expect(getCurrentIndex(container)).toBe(0);
    });

    it('在第一张继续向右滑，回到最后一张', () => {
      const { container, track } = renderSwiper({ loop: true });

      swipe(track, 50, 230);

      expect(getCurrentIndex(container)).toBe(2);
      expect(getActiveDot(container)).toBe(2);
    });
  });

  it('indicatorClassName 会加到指示器上', () => {
    const { container } = renderSwiper({ indicatorClassName: 'my-indicator' });

    expect(container.querySelector('.ygm-swiper-page-indicator.my-indicator')).not.toBeNull();
  });
});
