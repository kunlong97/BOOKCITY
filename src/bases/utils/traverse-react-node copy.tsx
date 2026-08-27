import React from 'react';
import { isFragment } from 'react-is';

/**
 * 深度遍历 React 节点树（自动穿透 Fragment）
 * @param children - 需要遍历的 React 节点（通常是组件的 props.children）
 * @param fn - 遍历到每个非 Fragment 节点时执行的回调函数，接收当前节点和索引
 */
export const traverseReactNode = (children: React.ReactNode, fn: (child: React.ReactNode, index: number) => void) => {
  const handle = (target: React.ReactNode) => {
    let i = 0;
    React.Children.forEach(target, (child) => {
      if (!isFragment(child)) {
        fn(child, i);
        i++;
      } else {
        handle(child.props.children);
      }
    });
  };

  handle(children);
};
