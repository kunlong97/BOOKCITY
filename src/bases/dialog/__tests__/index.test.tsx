import { act, fireEvent, render, screen } from '@testing-library/react';
import { Globals } from '@react-spring/web';
import Dialog, { DialogProps } from '../dialog';

// 跳过 react-spring 动画，让 onRest（afterShow / afterClose）尽快触发
beforeAll(() => {
  Globals.assign({ skipAnimation: true });
});

afterAll(() => {
  Globals.assign({ skipAnimation: false });
});


const setup = (props: DialogProps = {}) => {
  const utils = render(<Dialog visible {...props} />);
  const root = utils.container.querySelector('.ygm-dialog') as HTMLElement;
  const mask = utils.container.querySelector('.ygm-mask') as HTMLElement;
  return { ...utils, root, mask };
};

describe('Dialog', () => {
  describe('显示与隐藏', () => {
    it('visible 为 false 时不显示', () => {
      const { root } = setup({ visible: false });
      expect(root.style.display).toBe('none');
    });

    it('visible 为 true 时显示', () => {
      const { root } = setup({ visible: true });
      expect(root.style.display).toBe('');
    });

    it('visible 从 false 变为 true 时显示', () => {
      const { root, rerender } = setup({ visible: false });

      rerender(<Dialog visible />);

      expect(root.style.display).toBe('');
    });
  });

  describe('内容', () => {
    it('显示标题和内容', () => {
      setup({ title: 'New Group', content: <span>分组名称</span> });

      expect(screen.getByText('New Group').className).toBe('ygm-dialog-header');
      expect(screen.getByText('分组名称')).toBeTruthy();
    });

    it('没有 title 和 content 时不渲染对应区域', () => {
      const { container } = setup();

      expect(container.querySelector('.ygm-dialog-header')).toBeNull();
      expect(container.querySelector('.ygm-dialog-content')).toBeNull();
    });
  });

  describe('点击操作按钮', () => {
    it('调用按钮自己的 onClick，以及 onAction(action, index)', async () => {
      const onClick = jest.fn();
      const onAction = jest.fn();
      const actions = [
        { key: 'cancel', text: 'Cancel' },
        { key: 'confirm', text: 'Submit', onClick },
      ];
      setup({ actions, onAction });

      await act(async () => {
        fireEvent.click(screen.getByText('Submit'));
      });

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith(actions[1], 1);
    });

    it('closeOnAction 为 true 时，点击后调用 onClose', async () => {
      const onClose = jest.fn();
      setup({ actions: [{ key: 'ok', text: 'OK' }], closeOnAction: true, onClose });

      await act(async () => {
        fireEvent.click(screen.getByText('OK'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closeOnAction 未开启时，点击后不调用 onClose', async () => {
      const onClose = jest.fn();
      setup({ actions: [{ key: 'ok', text: 'OK' }], onClose });

      await act(async () => {
        fireEvent.click(screen.getByText('OK'));
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('点击蒙层时调用 onClose', () => {
    const onClose = jest.fn();
    const { mask } = setup({ onClose });

    fireEvent.click(mask);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
