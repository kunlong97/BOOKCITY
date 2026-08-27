import React from 'react';
import './styles/index.scss';
import cx from 'classnames';
import Tab from '@/bases/tabs/tab';
import { traverseReactNode } from '@/bases/utils/traverse-react-node';

// 定义 Tabs 组件的 Props 类型接口
export interface TabsProps {
  /** 当前激活 tab 面板的 key */
  activeKey: string;
  /** Tab 子组件集合 */
  children?: React.ReactNode;
  /** 是否显示 tab 下划线 */
  showTabLine?: boolean;
  /** tab 展示形式：线条型或卡片型 */
  type?: 'line' | 'card';
  /** 点击 tab 切换后的回调函数，参数为被点击 tab 的 key */
  onChange?: (key: string) => void;
  /** 激活状态下的 tab 自定义样式类名 */
  tabActiveClassName?: string;
  /** tab 列表容器的自定义样式类名 */
  tabListClassName?: string;
  /** tab 内容面板的自定义样式类名 */
  tabContentClassName?: string;
}

// 组件样式类名前缀，便于统一管理和避免样式冲突
const classPrefix = 'ygm-tabs';

const Tabs: React.FC<TabsProps> = (props) => {
  // 维护内部激活的 tab key 状态
  const [activeKey, setActiveKey] = React.useState<string>(props.activeKey);

  //当外部传入的 props.activeKey 发生变化时，同步更新内部状态
  React.useEffect(() => {
    setActiveKey(props.activeKey);
  }, [props.activeKey]);

  // 记录 key 到索引的映射关系（用于后续可能的性能优化或逻辑处理）
  const keyToIndexRecord: Record<string, number> = React.useMemo(() => ({}), []);

  // 提取出合法的 Tab 面板子组件
  const panes: React.ReactElement<React.ComponentProps<typeof Tab>>[] = [];

  // 遍历 children，过滤并收集有效的 Tab 子组件
  traverseReactNode(props.children, (child: React.ReactNode) => {
    // 如果不是合法的 React 元素，直接跳过（原代码逻辑反了）
    if (!React.isValidElement(child)) return;
    // 如果没有 key，无法进行匹配和渲染，直接跳过
    if (!child.key) return;

    // 将合法的子组件推入 panes 数组，并记录其索引
    const length = panes.push(child as React.ReactElement<React.ComponentProps<typeof Tab>>);
    keyToIndexRecord[child.key as string] = length - 1;
  });

  // 处理 tab 点击事件
  const onTab = (e: React.MouseEvent<HTMLDivElement>) => {
    // 从点击目标元素的 data-key 属性中获取对应的 key
    const key = (e.target as HTMLElement).dataset['key'] as string;
    // 更新内部激活状态
    setActiveKey(key);
    // 触发外部传入的 onChange 回调
    props?.onChange?.(key);
  };

  return (
    <div className={classPrefix}>
      {/* Tab 头部导航列表 */}
      <div
        className={cx(`${classPrefix}-tab-list`, props.tabListClassName, {
          [`${classPrefix}-tab-list-${props.type}`]: true,
        })}
      >
        {panes.map((item) => {
          return (
            <div
              key={item.key}
              className={cx(
                `${classPrefix}-tab`,
                // 如果当前 tab 的 key 等于激活的 key，则追加激活样式
                {
                  [`${classPrefix}-tab-active`]: activeKey === item.key,
                  [props.tabActiveClassName || '']: activeKey === item.key,
                },
              )}
              onClick={onTab}
              data-key={item.key}
            >
              <div className={`${classPrefix}-tab-title`} data-key={item.key}>
                {/* 渲染 Tab 的标题 */}
                {item.props.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab 内容面板区域 */}
      {panes.map((child) => {
        // 只有当子组件包含 children 时才渲染内容面板
        if (!child.props.children) return null;

        return (
          <div
            key={child.key}
            className={cx(`${classPrefix}-content`, props.tabContentClassName)}
            // 通过 display 样式控制面板的显示与隐藏
            // 这种方式可以保留面板的内部状态（如表单输入），避免频繁挂载/卸载
            style={{ display: activeKey === child.key ? 'block' : 'none' }}
          >
            {child.props.children}
          </div>
        );
      })}
    </div>
  );
};

// 设置组件的默认 Props
Tabs.defaultProps = {
  showTabLine: true,
  type: 'line',
};

// 设置组件的 displayName，方便在 React DevTools 中调试
Tabs.displayName = 'Tabs';

export default Tabs;
