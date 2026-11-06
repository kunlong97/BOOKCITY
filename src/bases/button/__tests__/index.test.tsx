import type React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Button, { ButtonProps } from '..';

const setup = (props: ButtonProps = {}) => {
  const utils = render(<Button {...props}>Submit</Button>);
  const button = screen.getByRole('button') as HTMLButtonElement;
  return { ...utils, button };
};

describe('Button', () => {
  it('渲染成原生 <button type="button">，能按角色找到', () => {
    const { button } = setup();

    expect(button.tagName).toBe('BUTTON');
    // 放在 <form> 里时不会被当成提交按钮
    expect(button.type).toBe('button');
  });

  it('按 props 加上颜色、尺寸、填充、形状、块级的类名', () => {
    const { button } = setup({ color: 'primary', size: 'large', fill: 'outline', shape: 'rounded', block: true, className: 'custom' });

    expect(button.className.split(' ')).toEqual(
      expect.arrayContaining([
        'ygm-button',
        'custom',
        'ygm-button-primary',
        'ygm-button-large',
        'ygm-button-fill-outline',
        'ygm-button-shape-rounded',
        'ygm-button-block',
      ]),
    );
  });

  it('点击时调用 onClick，并把事件传进去', () => {
    // React 在事件处理结束后会清空 currentTarget，要在回调里取
    let target: EventTarget | null = null;
    const onClick = jest.fn((e: React.MouseEvent<HTMLButtonElement>) => {
      target = e.currentTarget;
    });
    const { button } = setup({ onClick });

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(target).toBe(button);
  });

  it('disabled 时按钮被禁用、加上禁用样式，点击不会调用 onClick', () => {
    const onClick = jest.fn();
    const { button } = setup({ onClick, disabled: true });

    expect(button.disabled).toBe(true);
    expect(button.classList.contains('ygm-button-disabled')).toBe(true);

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading 为 true 时显示加载图标代替文字，点击不会调用 onClick', () => {
    const onClick = jest.fn();
    const { button, container } = setup({ onClick, loading: true });

    expect(container.querySelector('.ygm-spinner-loading')).not.toBeNull();
    expect(screen.queryByText('Submit')).toBeNull();
    expect(button.getAttribute('aria-busy')).toBe('true');

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('自定义 loadingIcon', () => {
    const { container } = setup({ loading: true, loadingIcon: <span className="my-icon" /> });

    expect(container.querySelector('.my-icon')).not.toBeNull();
    expect(container.querySelector('.ygm-spinner-loading')).toBeNull();
  });

  describe("loading='auto'", () => {
    it('onClick 返回 Promise 时自动进入加载状态，期间再点不会重复调用，完成后恢复', async () => {
      let resolve!: () => void;
      const onClick = jest.fn(() => new Promise<void>((r) => {
          resolve = r;
        }));
      const { button, container } = setup({ onClick, loading: 'auto' });

      fireEvent.click(button);
      expect(container.querySelector('.ygm-spinner-loading')).not.toBeNull();
      expect(button.getAttribute('aria-busy')).toBe('true');

      // 加载中再次点击：被忽略，避免重复提交
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);

      await act(async () => resolve());

      expect(container.querySelector('.ygm-spinner-loading')).toBeNull();
      expect(screen.getByText('Submit')).toBeTruthy();
      expect(button.hasAttribute('aria-busy')).toBe(false);
    });

    // "Promise 失败时也结束加载状态"没有单测：组件会把错误继续抛出（变成未处理的 Promise 拒绝，
    // 交给全局错误监控），Jest 在真实进程上监听这类拒绝并直接判测试失败，测试里接不住

    it('onClick 不返回 Promise 时不进入加载状态', () => {
      const { button, container } = setup({ onClick: jest.fn(), loading: 'auto' });

      fireEvent.click(button);

      expect(container.querySelector('.ygm-spinner-loading')).toBeNull();
    });
  });
});
