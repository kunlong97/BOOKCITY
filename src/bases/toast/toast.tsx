import React, { useEffect, useRef } from 'react';
import cx from 'classnames';

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
}

const classPrefix = 'ygm-toast';

const Toast: React.FC<ToastProps> = ({ duration = 2000, content, afterClose, unmount }) => {
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

  // afterClose 存进 ref，下面的 effect 不依赖它，重新渲染时传入新函数也不会提前触发
  const afterCloseRef = useRef(afterClose);
  afterCloseRef.current = afterClose;   //如果不做这行代码,那么useRef里的内容将永远停留在第一次挂载时的那个旧函数上。

  /**
   * 关闭回调逻辑
   * 组件卸载时触发 afterClose，通知外部 Toast 已消失
   * 注意：此 effect 仅在组件卸载时执行一次
   */
  useEffect(() => {
    return () => {
      afterCloseRef.current?.();
    };
  }, []);

  return (
    <div className={classPrefix}>
      <div className={cx(`${classPrefix}-main`, `${classPrefix}-main-text`)}>
        <div className={`${classPrefix}-text`}>{content}</div>
      </div>
    </div>
  );
};

Toast.displayName = 'Toast';

export default Toast;
