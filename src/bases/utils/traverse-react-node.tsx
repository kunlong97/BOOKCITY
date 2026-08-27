import React from 'react';

// 辅助函数：判断是否为 Fragment
const isFragment = (child: React.ReactNode): child is React.ReactElement => {
  return React.isValidElement(child) && child.type === React.Fragment;
};

export const traverseReactNode = (children: React.ReactNode, fn: (child: React.ReactNode, index: number) => void) => {
  let i = 0; // 将计数器提升到外层，保证全局递增

  const handle = (target: React.ReactNode) => {
    React.Children.forEach(target, (child) => {
      // 1. 过滤掉 null, undefined, boolean 等无效节点
      if (child === null || child === undefined || typeof child === 'boolean') {
        return;
      }

      // 2. 如果是 Fragment，递归处理其 children（不消耗索引）
      if (isFragment(child)) {
        handle(child.props.children);
      } else {
        // 3. 是合法节点，执行回调并递增索引
        fn(child, i);
        i++;
      }
    });
  };

  handle(children);
};
