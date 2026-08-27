import React from 'react';
import cx from 'classnames';

import SidebarItem from '@/bases/sidebar/sidebar-item';

import { traverseReactNode } from '@/bases/utils/traverse-react-node';

import './styles/index.scss';

export interface SidebarProps {
  /** 当前激活side item面板的key */
    activeKey: string;
  
    /** 点击side item切换后回调 */
    onChange?: (key: string) => void;
  
    /** 子元素 */
    children?: React.ReactNode;
  
    /** 基本样式 */
    style?: React.CSSProperties &
      Partial<
        Record<'--width' | '--height' | '--background-color' | '--content-padding' | '--sidebar-item-padding', string>
      >;
}

const classPrefix = `ygm-sidebar`;

const Sidebar: React.FC<SidebarProps> = React.memo((props) => {
  const items: React.ReactElement<React.ComponentProps<typeof SidebarItem>>[] = [];

  //遍历 React 节点
  traverseReactNode(props.children, (child) => {
    if (!React.isValidElement(child)) return;
    if (!child.key) return;
    items.push(child as React.ReactElement);
  });

  // 这里曾经用 useState(props.activeKey) 存了一份"内部" activeKey，只在挂载时
  // 取一次 props 的初始值，之后完全靠内部点击维护——外部想通过重新传入不同的
  // activeKey 来切换选中项是不生效的，因为组件根本不会去看后续渲染时的
  // props.activeKey。这个组件长得像受控组件（外部传 activeKey、传 onChange），
  // 实际行为却是"只受控一次、以后不受控"，是 ranking 页面那次 bug 的根因。
  // 直接用 props.activeKey 渲染，把"要不要切换选中项"这件事完全交给调用方
  // 通过 onChange 拿到 key 之后自己决定怎么更新，这里不再自己攒一份状态。
  const onSetActive = (e: React.MouseEvent<HTMLDivElement>) => {
    const key = (e.target as HTMLElement).dataset['key'] as string;
    props.onChange?.(key);
  };

  return (
    <div className={classPrefix}>
      <div className={`${classPrefix}-items`} style={props.style}>
        {items.map((item) => {
          const active = item.key === props.activeKey;   //是当前激活的SidebarItem的key,值为true
          return (
            <div
              className={cx(`${classPrefix}-item`, {
                [`${classPrefix}-item-active`]: active,
              })}
              key={item.key}
              data-key={item.key}
              onClick={onSetActive}
            >
              <div className={`${classPrefix}-item-title`} data-key={item.key}>
                {item.props.title}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`${classPrefix}-content`}>
        {items.map((item) => (
          <div
            className={`${classPrefix}-content-item`}
            key={item.key}
            style={{
              display: props.activeKey === item.key ? 'block' : 'none',
            }}
          >
            {item.props.children}
          </div>
        ))}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
