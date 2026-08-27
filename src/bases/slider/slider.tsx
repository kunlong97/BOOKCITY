import React from 'react';
import cx from 'classnames';

import Thumb from '@/bases/slider/thumb';

import { getValueByScope } from '@/bases/utils/utils';

import './styles/slider.scss';

// 定义通过 ref 暴露给父组件的方法接口
export interface SliderRef {
  setValue: (value: number) => void;
}

export interface SliderProps {
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 滑块当前值 */
  value?: number;
  /** 步距（每次滑动或点击改变的数值跨度） */
  step?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 拖拽滑块时的回调（实时触发） */
  onChange?: (value: number) => void;
  /** 滑动结束或点击滑块后的回调（类似 touchEnd / mouseUp） */
  onChangeAfter?: (value: number) => void;
  /** 自定义 style 样式变量，支持 CSS 变量覆盖 */
  style?: React.CSSProperties &
    Partial<Record<'--slider-bar-fill-color' | '--slider-background-color' | '--slider-bar-height', string>>;
}

const classPrefix = 'ygm-slider';

// 使用 forwardRef 包装组件，以便父组件可以通过 ref 调用内部方法
const Slider = React.forwardRef<SliderRef, SliderProps>(
  ({ min = 0, max = 100, value = 0, step = 1, disabled = false, onChange, onChangeAfter, style }, ref) => {

    // 内部状态：初始化时通过 getValueByScope 确保初始值在合法范围内
    const [sliderValue, setSliderValue] = React.useState<number>(getValueByScope(value!, min!, max!));

    // 轨道元素的 DOM 引用，用于计算点击位置和宽度
    const trackRef = React.useRef<HTMLDivElement>(null);

    // 暴露 setValue 方法给父组件，允许外部直接修改滑块的值
    React.useImperativeHandle(ref, () => ({
      setValue: (val: number) => {
        setSliderValue(getValueByScope(val, min!, max!));
      },
    }));

    // 计算滑块的总范围（max - min）
    const scope = max! - min!;
    // 计算填充条的宽度百分比：(当前值 - 最小值) / 总范围 * 100%
    const fillSize = `${((sliderValue - min!) * 100) / scope}%`;

    /**
     * 根据鼠标/触摸的绝对位置计算对应的滑块值
     * @param position 原始位置对应的数值
     */
    const getValueByPosition = (position: number) => {
      // 1. 将位置限制在 min 和 max 之间
      const newPosition = getValueByScope(position, min!, max!);
      // 2. 按照 step 步距进行四舍五入对齐（例如 step=10，位置为 23 则对齐到 20）
      const value = Math.round(newPosition / step!) * step!;
      return value;
    };

    /**
     * 拖拽过程中的回调
     * @param position 拖拽时计算出的原始位置值
     */
    const onDrag = (position: number) => {
      const targetValue = getValueByPosition(position);
      // 更新内部状态
      setSliderValue(targetValue);
      // 触发实时变更回调
      onChange?.(targetValue);
    };

    /**
     * 拖拽结束时的回调
     * @param position 拖拽结束时的最终位置值
     */
    const onEnd = (position: number) => {
      const targetValue = getValueByPosition(position);
      // 触发结束回调
      onChangeAfter?.(targetValue);
    };

    /**
     * 点击轨道时的处理逻辑
     */
    const onTrack = (e: React.MouseEvent) => {
      e.stopPropagation(); // 阻止事件冒泡
      const track = trackRef.current;
      // 如果禁用或 DOM 节点不存在，直接返回
      if (disabled || !track) return;

      // 获取轨道相对于视口的位置和尺寸
      const rect = track.getBoundingClientRect();
      const sliderWidth = rect.width;
      const sliderOffsetLeft = rect.left;

      // 计算点击位置相对于轨道左侧的偏移量
      const delta = e.clientX - sliderOffsetLeft;
      // 将像素偏移量转换为对应的数值
      const position = (delta / sliderWidth) * scope + min!;

      // 计算最终对齐后的值，更新状态并触发结束回调
      const targetValue = getValueByPosition(position);
      setSliderValue(targetValue);
      onChangeAfter?.(targetValue);
    };

    return (
      // 轨道容器，绑定点击事件和 ref
      <div
        className={cx(classPrefix, { [`${classPrefix}-disabled`]: disabled })}
        style={style}
        ref={trackRef}
        onClick={onTrack}
      >
        {/* 填充进度条，通过动态 width 展示当前进度 */}
        <div className={`${classPrefix}-fill`} style={{ width: fillSize }} />

        {/* 可拖拽的滑块按钮，传递必要的状态和回调 */}
        <Thumb
          value={sliderValue}
          min={min!}
          max={max!}
          disabled={disabled!}
          trackRef={trackRef}
          onDrag={onDrag}
          onChangeAfter={onEnd}
        />
      </div>
    );
  },
);


// 设置组件显示名称，方便在 React DevTools 中调试
Slider.displayName = 'Slider';

export default Slider;
