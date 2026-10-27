import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Sidebar, { SidebarProps } from '..';

const renderSidebar = (props: Partial<SidebarProps> = {}) =>
  render(
    <Sidebar activeKey="001" {...props}>
      <Sidebar.Item key="001" title="Popular List">
        <div>最热榜书籍</div>
      </Sidebar.Item>
      <Sidebar.Item key="002" title="Bestseller list">
        <div>畅销榜书籍</div>
      </Sidebar.Item>
      <Sidebar.Item key="003" title="Trending List">
        <div>热搜榜书籍</div>
      </Sidebar.Item>
    </Sidebar>,
  );

// 侧边栏菜单项（带 data-key 的外层元素）
const getItem = (title: string) => screen.getByText(title).parentElement as HTMLElement;
const isActive = (title: string) => getItem(title).classList.contains('ygm-sidebar-item-active');
const isVisible = (text: string) => (screen.getByText(text).parentElement as HTMLElement).style.display === 'block';

describe('Sidebar', () => {
  describe('渲染', () => {
    it('按顺序渲染所有菜单项', () => {
      const { container } = renderSidebar();

      const titles = Array.from(container.querySelectorAll('.ygm-sidebar-item-title')).map((el) => el.textContent);
      expect(titles).toEqual(['Popular List', 'Bestseller list', 'Trending List']);
    });

    it('activeKey 对应的菜单项处于激活状态，并且只显示它的内容', () => {
      renderSidebar({ activeKey: '002' });

      expect(isActive('Bestseller list')).toBe(true);
      expect(isActive('Popular List')).toBe(false);
      expect(isActive('Trending List')).toBe(false);
      expect(isVisible('畅销榜书籍')).toBe(true);
      expect(isVisible('最热榜书籍')).toBe(false);
      expect(isVisible('热搜榜书籍')).toBe(false);
    });

    it('未激活的内容也会渲染（只是隐藏），切换回来时不需要重新加载', () => {
      renderSidebar();
      expect(screen.getByText('热搜榜书籍')).toBeTruthy();
    });

    it('activeKey 不匹配任何菜单项时，没有激活项，也不显示内容', () => {
      const { container } = renderSidebar({ activeKey: 'none' });

      expect(container.querySelector('.ygm-sidebar-item-active')).toBeNull();
      expect(isVisible('最热榜书籍')).toBe(false);
    });

    it('style 中的 CSS 变量会加到菜单列表上', () => {
      const { container } = renderSidebar({ style: { '--width': '100px' } });

      const items = container.querySelector('.ygm-sidebar-items') as HTMLElement;
      expect(items.style.getPropertyValue('--width')).toBe('100px');
    });
  });

  describe('点击', () => {
    it('点击菜单项标题时，用对应的 key 调用 onChange', () => {
      const onChange = jest.fn();
      renderSidebar({ onChange });

      fireEvent.click(screen.getByText('Trending List'));

      expect(onChange).toHaveBeenCalledWith('003');
    });
  });

  it('外部 activeKey 变化时切换选中项和内容（ranking 页的用法）', () => {
    const RankingLike = () => {
      const [activeKey, setActiveKey] = useState('001');
      return (
        <Sidebar activeKey={activeKey} onChange={setActiveKey}>
          <Sidebar.Item key="001" title="Popular List">
            <div>最热榜书籍</div>
          </Sidebar.Item>
          <Sidebar.Item key="002" title="Bestseller list">
            <div>畅销榜书籍</div>
          </Sidebar.Item>
        </Sidebar>
      );
    };
    render(<RankingLike />);

    fireEvent.click(screen.getByText('Bestseller list'));

    expect(isActive('Bestseller list')).toBe(true);
    expect(isVisible('畅销榜书籍')).toBe(true);
    expect(isVisible('最热榜书籍')).toBe(false);

    fireEvent.click(screen.getByText('Popular List'));

    expect(isActive('Popular List')).toBe(true);
    expect(isVisible('最热榜书籍')).toBe(true);
  });
});
