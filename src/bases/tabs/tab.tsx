import React from 'react';

export interface TabProps {
  key: string; //匹配显示哪一个tab
  title: string; //标签名称
  children?: React.ReactNode;
}

const Tab: React.FC<TabProps> = (props) => {
  return props.children ? (props.children as React.ReactElement) : null;
};

Tab.displayName = 'Tab';
export default Tab;
