import React from 'react';
import cx from 'classnames';
import { useSpring, animated } from '@react-spring/web'; //需要安装react-spring库，用来做动画
import useScrollLock from '@/hooks/useScrollLock';
import Mask from '@/bases/mask';
import './styles/index.scss';

export interface PopupProps {
  /** 指定弹出的位置 */
  position?: 'left' | 'top' | 'bottom' | 'right';
  /** 内容区域style属性 */
  style?: React.CSSProperties;
  /** 内容区域类名 */
  className?: string;
  /** 当前是否可见 */
  visible: boolean;
  children?: React.ReactNode;
  /** 是否展示蒙层 */
  mask?: boolean;
  /** 点击蒙层回调 */
  onMaskClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  /** 弹出框显示后回调 */
  afterShow?: () => void;
  /** 弹出框关闭后回调 */
  afterClose?: () => void;
}

const classPrefix = 'ygm-popup';

const Popup: React.FC<PopupProps> = ({
  position = 'left',
  style,
  className,
  visible = false,
  children,
  mask = true,
  onMaskClick,
  afterShow,
  afterClose,
}) => {
  useScrollLock(visible); //用于滚动条滚动，在下面封装

  const { percent } = useSpring({
    percent: visible ? 0 : 100,
    config: {
      precision: 0.1,
      mass: 0.4,
      tension: 300,
      friction: 30,
    },
    onRest: () => {
      //这个函数会在动画结束后执行
      if (visible) {
        afterShow?.();
      } else {
        afterClose?.();
      }
    },
  });

  return (
    <div className={classPrefix}>
      {mask && <Mask visible={visible} onMaskClick={onMaskClick} />}
      <animated.div
        className={cx(`${classPrefix}-body`, `${classPrefix}-${position}`, className)}
        style={{
          ...style,
          transform: percent.to((v) => {
            if (position === 'left') {
              return `translate(-${v}%, 0)`;
            }
            if (position === 'bottom') {
              return `translate(0, ${v}%)`;
            }
            if (position === 'right') {
              return `translate(${v}%, 0)`;
            }
            if (position === 'top') {
              return `translate(0, -${v}%)`;
            }
            return 'none';
          }),
        }}
      >
        {children}
      </animated.div>
    </div>
  );
};

export default Popup;

Popup.displayName = 'Popup';
