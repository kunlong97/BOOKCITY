import React from 'react';

import './styles/thumb.scss';

interface ThumbProps {
  value: number;       // 当前滑块的值
  min: number;         // 最小值
  max: number;         // 最大值
  disabled: boolean;   // 是否禁用
  trackRef: React.RefObject<HTMLDivElement>; // 父组件轨道的 DOM 引用
  onDrag: (value: number) => void;           // 拖拽时的回调
  onChangeAfter: (value: number) => void;    // 拖拽结束时的回调
}

const classPrefix = 'ygm-slider-thumb';

const Thumb: React.FC<ThumbProps> = (props) => {
  // 记录触摸开始时的 X 坐标
  const startX = React.useRef(0);
  // 记录拖拽结束/移动时的最终位置值
  const endX = React.useRef(0);
  // 记录拖拽开始前的旧值，用于计算增量
  const prevValue = React.useRef<number>(0);
  
  // 根据当前值计算滑块按钮的 left 百分比位置
  const currentPosition = `${((props.value - props.min) / (props.max - props.min)) * 100}%`;

  /**
   * 触摸开始事件
   */
  const onTouchStart = (e: React.TouchEvent) => {
    if (props.disabled) return;
    // 保存当前值作为基准，并记录初始触摸坐标
    prevValue.current = props.value;
    startX.current = e.touches[0].clientX;
  };

  /**
   * 触摸移动事件（核心拖拽逻辑）
   */
  const onTouchMove = (e: React.TouchEvent) => {
    const trackElement = props.trackRef.current;
    if (!trackElement || props.disabled) return;

    // 计算手指移动的像素距离
    const deltaX = e.touches[0].clientX - startX.current;
    // 获取轨道的总宽度
    const total = trackElement.offsetWidth;

    // 将像素移动距离转换为数值增量：(移动像素 / 轨道总宽) * 数值总范围
    const position = (deltaX / total) * (props.max - props.min);
    // 最终位置 = 初始值 + 增量
    const finalPosition = position + prevValue.current;
    
    // 更新 endX 引用，并触发父组件的拖拽回调
    endX.current = finalPosition;
    props.onDrag(finalPosition);
  };

  /**
   * 触摸结束事件
   */
  const onTouchEnd = () => {
    // 将最终位置传给父组件的结束回调
    props?.onChangeAfter(endX.current);
  };

  return (
    // 滑块容器，通过 left 样式定位，绑定触摸事件
    <div
      className={classPrefix}
      style={{ left: currentPosition }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 实际的按钮视觉元素 */}
      <div className={`${classPrefix}-button`} />
    </div>
  );
};

Thumb.displayName = 'Thumb';

export default Thumb;