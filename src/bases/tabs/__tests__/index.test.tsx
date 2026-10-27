import { fireEvent, render, screen } from '@testing-library/react';
import Tabs, { TabsProps } from '..';

const renderTabs = (props: Partial<TabsProps> = {}) =>
  render(
    <Tabs activeKey="1" {...props}>
      <Tabs.Tab key="1" title="Top Rated">
        <div>热门内容</div>
      </Tabs.Tab>
      <Tabs.Tab key="2" title="Bestsellers">
        <div>畅销内容</div>
      </Tabs.Tab>
      <Tabs.Tab key="3" title="Trending">
        <div>热搜内容</div>
      </Tabs.Tab>
    </Tabs>,
  );

// 标签头（带 data-key 的外层元素）
const getTab = (title: string) => screen.getByText(title).parentElement as HTMLElement;
// 内容面板
const getPane = (text: string) => screen.getByText(text).parentElement as HTMLElement;

const isActive = (title: string) => getTab(title).classList.contains('ygm-tabs-tab-active');
const isVisible = (text: string) => getPane(text).style.display === 'block';

describe('Tabs', () => {
  describe('渲染', () => {
    it('按顺序渲染所有标签头', () => {
      const { container } = renderTabs();

      const titles = Array.from(container.querySelectorAll('.ygm-tabs-tab-title')).map((el) => el.textContent);
      expect(titles).toEqual(['Top Rated', 'Bestsellers', 'Trending']);
    });

    it('activeKey 对应的标签处于激活状态，并且只显示它的内容面板', () => {
      renderTabs({ activeKey: '2' });

      expect(isActive('Bestsellers')).toBe(true);
      expect(isActive('Top Rated')).toBe(false);
      expect(isVisible('畅销内容')).toBe(true);
      expect(isVisible('热门内容')).toBe(false);
      expect(isVisible('热搜内容')).toBe(false);
    });

    it('未激活的面板也会渲染（只是隐藏），以保留内部状态', () => {
      renderTabs();
      expect(screen.getByText('热搜内容')).toBeTruthy();
    });

    it('type 为 card 时使用卡片样式', () => {
      const { container } = renderTabs({ type: 'card' });
      expect(container.querySelector('.ygm-tabs-tab-list-card')).not.toBeNull();
    });

    it('自定义类名分别加到标签列表、激活标签和内容面板上', () => {
      const { container } = renderTabs({
        tabListClassName: 'my-list',
        tabActiveClassName: 'my-active',
        tabContentClassName: 'my-content',
      });

      expect(container.querySelector('.ygm-tabs-tab-list.my-list')).not.toBeNull();
      expect(getTab('Top Rated').classList.contains('my-active')).toBe(true);
      expect(getTab('Bestsellers').classList.contains('my-active')).toBe(false);
      expect(container.querySelectorAll('.ygm-tabs-content.my-content')).toHaveLength(3);
    });
  });

  describe('子元素处理', () => {
    it('没有 key 的子元素和非元素内容会被忽略', () => {
      const { container } = render(
        <Tabs activeKey="1">
          <Tabs.Tab key="1" title="A" />
          {/* @ts-expect-error 故意不传 key，验证会被忽略 */}
          <Tabs.Tab title="NoKey" />
          纯文本
          {null}
        </Tabs>,
      );

      const titles = Array.from(container.querySelectorAll('.ygm-tabs-tab-title')).map((el) => el.textContent);
      expect(titles).toEqual(['A']);
    });

    it('支持用 Fragment 包裹或 map 生成的标签', () => {
      const list = ['a', 'b'];
      const { container } = render(
        <Tabs activeKey="a">
          <>
            {list.map((k) => (
              <Tabs.Tab key={k} title={k.toUpperCase()} />
            ))}
          </>
        </Tabs>,
      );

      const titles = Array.from(container.querySelectorAll('.ygm-tabs-tab-title')).map((el) => el.textContent);
      expect(titles).toEqual(['A', 'B']);
    });

    it('没有内容的标签不渲染内容面板', () => {
      const { container } = render(
        <Tabs activeKey="1">
          <Tabs.Tab key="1" title="A">
            <div>内容</div>
          </Tabs.Tab>
          <Tabs.Tab key="2" title="B" />
        </Tabs>,
      );

      expect(container.querySelectorAll('.ygm-tabs-content')).toHaveLength(1);
    });
  });

  describe('点击切换', () => {
    it('点击标签标题切换激活状态和内容面板，并调用 onChange', () => {
      const onChange = jest.fn();
      renderTabs({ onChange });

      fireEvent.click(screen.getByText('Trending'));

      expect(onChange).toHaveBeenCalledWith('3');
      expect(isActive('Trending')).toBe(true);
      expect(isActive('Top Rated')).toBe(false);
      expect(isVisible('热搜内容')).toBe(true);
      expect(isVisible('热门内容')).toBe(false);
    });

    it('不传 onChange 时也能切换', () => {
      renderTabs();

      fireEvent.click(screen.getByText('Bestsellers'));

      expect(isVisible('畅销内容')).toBe(true);
    });
  });

  it('外部 activeKey 变化时同步切换', () => {
    const { rerender } = renderTabs({ activeKey: '1' });

    rerender(
      <Tabs activeKey="3">
        <Tabs.Tab key="1" title="Top Rated">
          <div>热门内容</div>
        </Tabs.Tab>
        <Tabs.Tab key="2" title="Bestsellers">
          <div>畅销内容</div>
        </Tabs.Tab>
        <Tabs.Tab key="3" title="Trending">
          <div>热搜内容</div>
        </Tabs.Tab>
      </Tabs>,
    );

    expect(isActive('Trending')).toBe(true);
    expect(isVisible('热搜内容')).toBe(true);
  });
});
