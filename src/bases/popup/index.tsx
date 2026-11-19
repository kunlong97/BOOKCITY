import React from 'react';
import cx from 'classnames';
import { useSpring, animated } from '@react-spring/web'; // 需要安装react-spring库，用来做动画
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
  visible?: boolean;
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
  useScrollLock(visible);

  const { percent } = useSpring({
    percent: visible ? 0 : 100,
    config: {
      precision: 0.1,
      mass: 0.4,
      tension: 300,
      friction: 30,
    },
    onRest: () => {
      // 这个函数会在动画结束后执行
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
              // 用 ${-v} 而不是 -${v}：v 为 0 时得到 0% 而不是 -0%
              return `translate(${-v}%, 0)`;
            }
            if (position === 'bottom') {
              return `translate(0, ${v}%)`;
            }
            if (position === 'right') {
              return `translate(${v}%, 0)`;
            }
            if (position === 'top') {
              return `translate(0, ${-v}%)`;
            }
            return 'none';
          }),
          // 完全收起后（v 到 100）再隐藏：
          // 1. 电脑上内容区居中，两侧还有空白，只靠 translate 移出内容区的弹层会露在两侧的空白里；
          // 2. 隐藏的弹层不该再被键盘 Tab 到、被读屏软件读到。
          // 滑入时一开始（v 小于 100）就恢复可见，不影响动画
          visibility: percent.to((v) => (v >= 100 ? 'hidden' : 'visible')),
          // 左右弹层滑动时，把移出内容区的那部分裁掉：
          // 电脑上内容区居中，弹层的起点是内容区边缘；向左平移自身宽度的 v% 时，左边 v% 正好在内容区外、
          // 露在两侧的空白里。按同样的 v% 裁掉，看起来就是从内容区边缘滑出来的。
          // 手机上被裁掉的部分本来就在屏幕外，没有影响；上下弹层没有这个问题，不裁
          clipPath: percent.to((v) => {
            if (position === 'left') return `inset(0 0 0 ${v}%)`;
            if (position === 'right') return `inset(0 ${v}% 0 0)`;
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
