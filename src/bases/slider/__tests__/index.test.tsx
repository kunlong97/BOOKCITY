import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import Slider, { SliderProps, SliderRef } from '..';

const TRACK_LEFT = 100;
const TRACK_WIDTH = 200;

// jsdom 不做布局，轨道的尺寸和位置都是 0，这里手动给轨道设置宽度和位置
const mockTrackLayout = (track: HTMLElement) => {
  Object.defineProperty(track, 'offsetWidth', { configurable: true, value: TRACK_WIDTH });
  track.getBoundingClientRect = () =>
    ({ left: TRACK_LEFT, width: TRACK_WIDTH, top: 0, right: TRACK_LEFT + TRACK_WIDTH, bottom: 0, height: 0 }) as DOMRect;
};

const setup = (props: SliderProps = {}) => {
  const onChange = jest.fn();
  const onChangeAfter = jest.fn();
  const ref = React.createRef<SliderRef>();
  const utils = render(<Slider ref={ref} onChange={onChange} onChangeAfter={onChangeAfter} {...props} />);

  const track = utils.container.querySelector('.ygm-slider') as HTMLElement;
  const fill = utils.container.querySelector('.ygm-slider-fill') as HTMLElement;
  const thumb = utils.container.querySelector('.ygm-slider-thumb') as HTMLElement;
  mockTrackLayout(track);

  return { ...utils, ref, track, fill, thumb, onChange, onChangeAfter };
};

// 模拟手指在滑块上从 fromX 拖到 toX（像素坐标）
const drag = (thumb: HTMLElement, fromX: number, toX: number) => {
  fireEvent.touchStart(thumb, { touches: [{ clientX: fromX }] });
  fireEvent.touchMove(thumb, { touches: [{ clientX: toX }] });
  fireEvent.touchEnd(thumb);
};

describe('Slider', () => {
  describe('初始位置', () => {
    it('默认范围 0~100，未传 value 时位于最左侧', () => {
      const { fill, thumb } = setup();
      expect(fill.style.width).toBe('0%');
      expect(thumb.style.left).toBe('0%');
    });

    it('按 value 在 min~max 中的比例定位', () => {
      const { fill, thumb } = setup({ min: 0, max: 100, value: 25 });
      expect(fill.style.width).toBe('25%');
      expect(thumb.style.left).toBe('25%');
    });

    it('min 不为 0 时按偏移后的比例定位（字号 14~28，当前 21 位于正中）', () => {
      const { fill } = setup({ min: 14, max: 28, value: 21 });
      expect(fill.style.width).toBe('50%');
    });

    it('未传 value 时取 min（字号滑块不传 value 会停在最左侧）', () => {
      const { fill } = setup({ min: 14, max: 28 });
      expect(fill.style.width).toBe('0%');
    });

    it.each([
      [-10, '0%'],
      [200, '100%'],
    ])('value 超出范围（%i）时被限制在范围内', (value, width) => {
      const { fill } = setup({ min: 0, max: 100, value });
      expect(fill.style.width).toBe(width);
    });
  });

  describe('拖动滑块', () => {
    it('拖动时按移动距离实时更新位置，并触发 onChange', () => {
      const { thumb, fill, onChange } = setup({ min: 0, max: 100, value: 20 });

      fireEvent.touchStart(thumb, { touches: [{ clientX: 0 }] });
      // 轨道宽 200px，范围 100，向右移动 60px 相当于 +30
      fireEvent.touchMove(thumb, { touches: [{ clientX: 60 }] });

      expect(onChange).toHaveBeenLastCalledWith(50);
      expect(fill.style.width).toBe('50%');
    });

    it('松手时触发 onChangeAfter，值为最终位置', () => {
      const { thumb, onChangeAfter } = setup({ min: 0, max: 100, value: 20 });

      drag(thumb, 0, 60);

      expect(onChangeAfter).toHaveBeenCalledTimes(1);
      expect(onChangeAfter).toHaveBeenCalledWith(50);
    });

    it('向左拖动减小数值', () => {
      const { thumb, onChange } = setup({ min: 14, max: 28, value: 21 });

      // 范围 14，向左 100px 相当于 -7
      drag(thumb, 150, 50);

      expect(onChange).toHaveBeenLastCalledWith(14);
    });

    it('拖出范围时被限制在 min~max 之间', () => {
      const { thumb, onChange, onChangeAfter } = setup({ min: 0, max: 100, value: 50 });

      drag(thumb, 0, 1000);
      expect(onChange).toHaveBeenLastCalledWith(100);
      expect(onChangeAfter).toHaveBeenLastCalledWith(100);

      drag(thumb, 0, -1000);
      expect(onChange).toHaveBeenLastCalledWith(0);
    });

    it('按 step 对齐数值', () => {
      const { thumb, onChange } = setup({ min: 0, max: 100, value: 0, step: 10 });

      // +23 对齐到 20
      fireEvent.touchStart(thumb, { touches: [{ clientX: 0 }] });
      fireEvent.touchMove(thumb, { touches: [{ clientX: 46 }] });
      expect(onChange).toHaveBeenLastCalledWith(20);

      // +27 对齐到 30
      fireEvent.touchMove(thumb, { touches: [{ clientX: 54 }] });
      expect(onChange).toHaveBeenLastCalledWith(30);
    });

    it('连续拖动时以上一次的值为起点', () => {
      const { thumb, onChange } = setup({ min: 0, max: 100, value: 0 });

      drag(thumb, 0, 40); // +20
      drag(thumb, 0, 40); // 再 +20

      expect(onChange).toHaveBeenLastCalledWith(40);
    });
  });

  describe('点击轨道', () => {
    it('跳到点击位置，并只触发 onChangeAfter', () => {
      const { track, fill, onChange, onChangeAfter } = setup({ min: 0, max: 100, value: 0 });

      // 轨道从 100px 开始、宽 200px，点击 250px 处即 75%
      fireEvent.click(track, { clientX: 250 });

      expect(fill.style.width).toBe('75%');
      expect(onChangeAfter).toHaveBeenCalledWith(75);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('点击位置按 step 对齐', () => {
      const { track, onChangeAfter } = setup({ min: 14, max: 28, value: 14, step: 1 });

      // 点击 30% 处：14 + 0.3 * 14 = 18.2，对齐到 18
      fireEvent.click(track, { clientX: TRACK_LEFT + TRACK_WIDTH * 0.3 });

      expect(onChangeAfter).toHaveBeenCalledWith(18);
    });
  });

  describe('禁用', () => {
    it('添加禁用样式类名', () => {
      const { track } = setup({ disabled: true });
      expect(track.classList.contains('ygm-slider-disabled')).toBe(true);
    });

    it('拖动时不改变数值，也不触发 onChange', () => {
      const { thumb, fill, onChange } = setup({ min: 0, max: 100, value: 20, disabled: true });

      fireEvent.touchStart(thumb, { touches: [{ clientX: 0 }] });
      fireEvent.touchMove(thumb, { touches: [{ clientX: 60 }] });

      expect(onChange).not.toHaveBeenCalled();
      expect(fill.style.width).toBe('20%');
    });

    it('点击轨道不改变数值', () => {
      const { track, fill, onChangeAfter } = setup({ min: 0, max: 100, value: 20, disabled: true });

      fireEvent.click(track, { clientX: 250 });

      expect(onChangeAfter).not.toHaveBeenCalled();
      expect(fill.style.width).toBe('20%');
    });
  });

  describe('ref.setValue', () => {
    it('通过 ref 直接设置数值', () => {
      const { ref, fill } = setup({ min: 0, max: 100, value: 0 });

      act(() => ref.current!.setValue(60));

      expect(fill.style.width).toBe('60%');
    });

    it('设置的值超出范围时被限制', () => {
      const { ref, fill } = setup({ min: 0, max: 100, value: 0 });

      act(() => ref.current!.setValue(500));

      expect(fill.style.width).toBe('100%');
    });

    it('不会触发 onChange / onChangeAfter', () => {
      const { ref, onChange, onChangeAfter } = setup({ min: 0, max: 100, value: 0 });

      act(() => ref.current!.setValue(60));

      expect(onChange).not.toHaveBeenCalled();
      expect(onChangeAfter).not.toHaveBeenCalled();
    });
  });
});
