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
   */
  const doUnmount = () => {
    closeCurrent = null;
    document.body.removeChild(container); // 从 body 中移除 DOM 容器
    root.unmount(); // 卸载 React 根节点，清理所有子组件和副作用
  };
  closeCurrent = doUnmount;

  root.render(React.createElement(ToastComponent, { ...props, unmount: doUnmount }));
};
