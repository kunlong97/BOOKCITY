import React from 'react';

import { useSpring, animated } from '@react-spring/web';

import Mask, { MaskProps } from '@/bases/mask';
import DialogActionButton, { Action } from '@/bases/dialog/dialog-action-button';

import useIsomorphicLayoutEffect from '@/hooks/useIsomorphicLayout';

import './styles/index.scss';

export interface DialogProps {
  /** 对话框标题 */
  title?: React.ReactNode;
  /** 对话框内容 */
  content?: React.ReactNode;
  /** 显示隐藏 */
  visible?: boolean;
  actions?: Action[];
  maskStyle?: MaskProps['style'];
  /** 点击action后是否关闭 */
  closeOnAction?: boolean;
  /** Dialog关闭时的回调 */
  onClose?: () => void;
  /** 显示后回调 */
  afterShow?: () => void;
  /** 关闭后回调 */
  afterClose?: () => void;
  /** 点击action后回调 */
  onAction?: (action: Action, index: number) => void | Promise<void>;
}

const classPrefix = 'ygm-dialog';

const Dialog: React.FC<DialogProps> = ({
  title,
  content,
  visible = false,
  actions = [],
  maskStyle,
  closeOnAction,
  onClose,
  afterShow,
  afterClose,
  onAction,
}) => {
  const [active, setActive] = React.useState<boolean>(visible!);

  const style = useSpring({
    // Dialog弹出的动画效果
    scale: visible ? 1 : 0.8,
    opacity: visible ? 1 : 0,
    config: {
      mass: 2.2,
      tension: 200,
      friction: 25,
      clamp: true,
    },
    onRest: () => {
      if (visible) {
        afterShow?.();
      } else {
        afterClose?.();
      }
    },
  });

  // Dialog框顶部内容
  const renderTitle = () => {
    if (title) {
      return <div className={`${classPrefix}-header`}>{title}</div>;
    }
    return null;
  };

  // Dialog框中间内容
  const renderContent = () => {
    if (content) {
      return (
        <div className={`${classPrefix}-content`}>
          <div>{content}</div>
        </div>
      );
    }
    return null;
  };

  // Dialog框底部内容
  const renderFooter = () => {
    return (
      <div className={`${classPrefix}-footer`}>
        {actions!.map((action, index) => (
          <DialogActionButton
            key={action.key}
            action={action}
            onAction={async () => {
              await Promise.all([action.onClick?.(), onAction?.(action, index)]); //Promise.all()用于并行处理多个 Promise，并在所有 Promise 都成功解决（resolved）时返回结果。如果其中任何一个 Promise 被拒绝（rejected），Promise.all?会立即返回该拒绝的原因。
              if (closeOnAction) {
                onClose?.();
              }
            }}
          />
        ))}
      </div>
    );
  };

  useIsomorphicLayoutEffect(() => {
    if (visible) {
      setActive(true);
    }
  }, [visible]);

  return (
    <div className={classPrefix} style={{ display: active ? undefined : 'none' }}>
      <Mask visible={visible!} style={maskStyle} onMaskClick={onClose} />
      <div className={`${classPrefix}-wrap`}>
        <animated.div style={style}>
          <div className={`${classPrefix}-body`}>
            {renderTitle()}
            {renderContent()}
            {renderFooter()}
          </div>
        </animated.div>
      </div>
    </div>
  );
};


Dialog.displayName = 'Dialog';

export default Dialog;
