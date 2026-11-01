import React from 'react';
import ReactDOM from 'react-dom/client';
import ToastComponent, { ToastProps } from '@/bases/toast/toast';

export type ToastShowProps = ToastProps;

// 当前正在显示的 Toast 的卸载函数。Toast 都固定在屏幕同一位置，同时显示会叠在一起，所以同一时间只保留一条
let closeCurrent: (() => void) | null = null;

export const show = (p: ToastShowProps | string) => {
  closeCurrent?.(); // 显示新的之前先关掉上一条

  const props = typeof p === 'string' ? { content: p } : p; // 参数兼容处理：传入字符串时自动包装为 { content: p }

  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container); // 创建 React的根节点（createRoot）,来接管这个独立容器的所有生命周期,没有这个根节点，root.render()?就无法工作

  /**
   * 卸载函数：由 Toast 组件内部在 duration 到期后调用
   * 负责清理 DOM 节点和 React 根节点，防止内存泄漏
   * doUnmount应保持幂等性：因为在定时器里会自动触发unmount，show()里的closeCurrent也可以触发unmount，如果这两种情况一起发生了，会unmount两次，会报错
   *
   */
  let closed = false;
  const doUnmount = () => {
    if (closed) return; // 已经卸载过了，直接返回
    closed = true;
    closeCurrent = null;
    root.unmount();
    document.body.removeChild(container);
  };
  closeCurrent = doUnmount;

  root.render(React.createElement(ToastComponent, { ...props, unmount: doUnmount }));
};
