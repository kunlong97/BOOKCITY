import { fireEvent, render, waitFor } from '@testing-library/react';
import { Globals } from '@react-spring/web';
import Mask from '..';

// 跳过 react-spring 动画，让 onRest 尽快触发
beforeAll(() => {
  Globals.assign({ skipAnimation: true });
});

afterAll(() => {
  Globals.assign({ skipAnimation: false });
});

const html = document.documentElement;

describe('Mask', () => {
  afterEach(() => {
    html.style.overflow = '';
  });

  const getMask = (container: HTMLElement) => container.querySelector('.ygm-mask') as HTMLElement;

  describe('显示与隐藏', () => {
    it('visible 为 false 时隐藏', () => {
      const { container } = render(<Mask visible={false} />);
      expect(getMask(container).style.display).toBe('none');
    });

    it('visible 为 true 时显示', () => {
      const { container } = render(<Mask visible />);
      expect(getMask(container).style.display).toBe('');
    });

    it('从隐藏变为显示时立即显示（不等动画）', () => {
      const { container, rerender } = render(<Mask visible={false} />);

      rerender(<Mask visible />);

      expect(getMask(container).style.display).toBe('');
    });

    it('从显示变为隐藏时，动画结束后隐藏', async () => {
      const { container, rerender } = render(<Mask visible />);

      rerender(<Mask visible={false} />);

      await waitFor(() => expect(getMask(container).style.display).toBe('none'));
    });
  });

  describe('点击', () => {
    it('点击蒙层调用 onMaskClick', () => {
      const onMaskClick = jest.fn();
      const { container } = render(<Mask visible onMaskClick={onMaskClick} />);

      fireEvent.click(getMask(container));

      expect(onMaskClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('锁定页面滚动', () => {
    it('显示时锁定，隐藏时解除', () => {
      const { rerender } = render(<Mask visible />);
      expect(html.style.overflow).toBe('hidden');

      rerender(<Mask visible={false} />);
      expect(html.style.overflow).toBe('');
    });
    
    it('解除时恢复页面原有的 overflow 值', () => {
      html.style.overflow = 'scroll';
      const { unmount } = render(<Mask visible />);
      expect(html.style.overflow).toBe('hidden');

      unmount();

      expect(html.style.overflow).toBe('scroll');
    });
  });
});
