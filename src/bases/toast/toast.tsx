import React, { useEffect, useMemo } from 'react';
import cx from 'classnames';
import { CheckOutline, CloseOutline } from 'antd-mobile-icons';
import SpinnerLoading from '@/bases/spinner-loading';
import './styles/index.scss';

export interface ToastProps {
  /** 弹窗提示持续时间 */
  duration?: number;
  /** Toast文本内容 */
  content: React.ReactNode;
  /** Toast关闭后的回调 */
  afterClose?: () => void;
  /** 卸载当前Toast的DOM */
  unmount?: () => void;
  /** Toast图标 */
  icon?: 'success' | 'fail' | 'loading' | React.ReactNode;
}

const classPrefix = 'ygm-toast';

const Toast: React.FC<ToastProps> = ({ duration = 2000, content, afterClose, unmount, icon }) => {
  const iconElement = useMemo(() => {
    if (icon === null || icon === undefined) return null;
    switch (icon) {
      case 'success':
        return <CheckOutline />;
      case 'fail':
        return <CloseOutline />;
      case 'loading':
        return <SpinnerLoading color="white" />;
      default:
        return icon;
    }
  }, [icon]);

  /**
   * 自动消失逻辑
   * 组件挂载后设置定时器，到期后调用 unmount 卸载自身
   * 组件卸载时清除定时器，防止内存泄漏
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      unmount?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [unmount, duration]);

  /**
   * 关闭回调逻辑
   * 组件卸载时触发 afterClose，通知外部 Toast 已消失
   * 注意：此 effect 仅在组件卸载时执行一次
   */
  useEffect(() => {
    return () => {
      afterClose?.();
    };
  }, [afterClose]);

  return (
    <div className={classPrefix}>
      <div className={cx(`${classPrefix}-main`, icon ? `${classPrefix}-main-icon` : `${classPrefix}-main-text`)}>
        {iconElement && <div className={`${classPrefix}-icon`}>{iconElement}</div>}
        <div className={`${classPrefix}-text`}>{content}</div>
      </div>
    </div>
  );
};

Toast.displayName = 'Toast';

export default Toast;
