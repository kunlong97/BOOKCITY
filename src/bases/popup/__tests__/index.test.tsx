import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Globals } from '@react-spring/web';
import Popup, { PopupProps } from '..';

// 跳过 react-spring 动画：位置直接到终点，onRest 尽快触发
beforeAll(() => {
  Globals.assign({ skipAnimation: true });
});

afterAll(() => {
  Globals.assign({ skipAnimation: false });
});

const html = document.documentElement;

const setup = (props: Partial<PopupProps> = {}) => {
  const utils = render(
    <Popup visible {...props}>
      <div>弹出内容</div>
    </Popup>,
  );
  const body = utils.container.querySelector('.ygm-popup-body') as HTMLElement;
  const mask = utils.container.querySelector('.ygm-mask') as HTMLElement | null;
  return { ...utils, body, mask };
};

describe('Popup', () => {
  afterEach(() => {
    html.style.overflow = '';
  });

  describe('渲染', () => {
    it('渲染子元素', () => {
      setup();
      expect(screen.getByText('弹出内容')).toBeTruthy();
    });

    it('默认从左侧弹出', () => {
      const { body } = setup();
      expect(body.classList.contains('ygm-popup-left')).toBe(true);
    });

    it('className 和 style 会加到内容区域上', () => {
      const { body } = setup({ className: 'my-popup', style: { height: '40vh' } });

      expect(body.classList.contains('my-popup')).toBe(true);
      expect(body.style.height).toBe('40vh');
    });
  });

  describe('位置与动画', () => {
    // 源码对 left / top 生成的是 "-0%"，jsdom 解析样式时会规范化为 "0%"
    it.each([
      ['left', 'translate(0%, 0)'],
      ['right', 'translate(0%, 0)'],
      ['top', 'translate(0, 0%)'],
      ['bottom', 'translate(0, 0%)'],
    ] as const)('visible 时从 %s 侧完全滑入', (position, transform) => {
      const { body } = setup({ position });

      expect(body.classList.contains(`ygm-popup-${position}`)).toBe(true);
      expect(body.style.transform).toBe(transform);
    });

    it.each([
      ['left', 'translate(-100%, 0)'],
      ['right', 'translate(100%, 0)'],
      ['top', 'translate(0, -100%)'],
      ['bottom', 'translate(0, 100%)'],
    ] as const)('隐藏时向 %s 侧完全移出', (position, transform) => {
      const { body } = setup({ position, visible: false });
      expect(body.style.transform).toBe(transform);
    });

    it('visible 切换时内容区域跟着滑入、滑出', async () => {
      const { body, rerender } = setup({ position: 'bottom', visible: false });

      rerender(
        <Popup position="bottom" visible>
          <div />
        </Popup>,
      );
      await waitFor(() => expect(body.style.transform).toBe('translate(0, 0%)'));

      rerender(
        <Popup position="bottom" visible={false}>
          <div />
        </Popup>,
      );
      await waitFor(() => expect(body.style.transform).toBe('translate(0, 100%)'));
    });
  });

  describe('蒙层', () => {
    it('默认显示蒙层，点击时调用 onMaskClick', () => {
      const onMaskClick = jest.fn();
      const { mask } = setup({ onMaskClick });

      expect(mask).not.toBeNull();
      fireEvent.click(mask!);

      expect(onMaskClick).toHaveBeenCalledTimes(1);
    });

    it('mask 为 false 时不渲染蒙层', () => {
      const { mask } = setup({ mask: false });
      expect(mask).toBeNull();
    });
  });

  describe('动画回调', () => {
    it('显示动画结束后调用 afterShow', async () => {
      const afterShow = jest.fn();
      const { rerender } = setup({ visible: false, afterShow });

      rerender(<Popup visible afterShow={afterShow} />);

      await waitFor(() => expect(afterShow).toHaveBeenCalled());
    });

    it('隐藏动画结束后调用 afterClose', async () => {
      const afterClose = jest.fn();
      const { rerender } = setup({ visible: true, afterClose });

      rerender(<Popup visible={false} afterClose={afterClose} />);

      await waitFor(() => expect(afterClose).toHaveBeenCalled());
    });
  });

  describe('锁定页面滚动', () => {
    it('显示时锁定', () => {
      setup({ visible: true });
      expect(html.style.overflow).toBe('hidden');
    });

    it('不带蒙层时，显示时锁定、关闭后解除', () => {
      const { rerender } = setup({ visible: true, mask: false });
      expect(html.style.overflow).toBe('hidden');

      rerender(<Popup visible={false} mask={false} />);
      expect(html.style.overflow).toBe('');
    });

    it('不带蒙层时，卸载后恢复页面原有的 overflow 值', () => {
      html.style.overflow = 'auto';
      const { unmount } = setup({ visible: true, mask: false });

      unmount();

      expect(html.style.overflow).toBe('auto');
    }); 

    it('带蒙层时，卸载后恢复页面原有的 overflow 值', () => {
      html.style.overflow = 'auto';
      const { unmount } = setup({ visible: true });

      unmount();

      expect(html.style.overflow).toBe('auto');
    });
  });
});
