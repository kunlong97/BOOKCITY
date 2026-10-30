import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Input, { InputProps, InputRef } from '..';

const setup = (props: InputProps = {}) => {
  const ref = React.createRef<InputRef>();
  const utils = render(<Input ref={ref} {...props} />);
  const input = utils.container.querySelector('input') as HTMLInputElement;
  const getClear = () => utils.container.querySelector('.ygm-input-clear') as HTMLElement | null;
  return { ...utils, ref, input, getClear };
};

describe('Input', () => {
  describe('渲染', () => {
    it('显示初始 value 和 placeholder', () => {
      const { input } = setup({ value: '三体', placeholder: 'Search books' });

      expect(input.value).toBe('三体');
      expect(input.placeholder).toBe('Search books');
    });

    it('默认关闭自动补全、自动大写和自动纠错，类型为 text', () => {
      const { input } = setup();

      expect(input.getAttribute('autocomplete')).toBe('off');
      expect(input.getAttribute('autocapitalize')).toBe('off');
      expect(input.getAttribute('autocorrect')).toBe('off');
      expect(input.type).toBe('text');
      expect(input.value).toBe('');
    });

    it('原生属性透传到 input 上', () => {
      const { input } = setup({
        id: 'group-name',
        name: 'groupName',
        type: 'search',
        maxLength: 10,
        minLength: 2,
        inputMode: 'search',
        autoComplete: 'on',
      });

      expect(input.id).toBe('group-name');
      expect(input.name).toBe('groupName');
      expect(input.type).toBe('search');
      expect(input.maxLength).toBe(10);
      expect(input.minLength).toBe(2);
      expect(input.getAttribute('inputmode')).toBe('search');
      expect(input.getAttribute('autocomplete')).toBe('on');
    });

    it('style 加到 input 上', () => {
      const { input } = setup({ style: { '--placeholder-color': 'gray', color: 'red' } });

      expect(input.style.color).toBe('red');
      expect(input.style.getPropertyValue('--placeholder-color')).toBe('gray');
    });

    it('disabled 时禁用 input，并加上禁用样式', () => {
      const { input, container } = setup({ disabled: true });

      expect(input.disabled).toBe(true);
      expect(container.firstElementChild!.classList.contains('ygm-input-disabled')).toBe(true);
    });

    it('readOnly 时 input 只读', () => {
      const { input } = setup({ readOnly: true });
      expect(input.readOnly).toBe(true);
    });
  });

  describe('输入', () => {
    it('输入时更新显示的内容，并用新值调用 onChange', () => {
      const onChange = jest.fn();
      const { input } = setup({ onChange });

      fireEvent.change(input, { target: { value: '球状闪电' } });

      expect(input.value).toBe('球状闪电');
      expect(onChange).toHaveBeenCalledWith('球状闪电');
    });

    it('不传 onChange 时也能正常输入', () => {
      const { input } = setup();

      fireEvent.change(input, { target: { value: 'abc' } });

      expect(input.value).toBe('abc');
    });
  });

  describe('清除按钮', () => {
    it('clearable 且有内容时显示清除按钮', () => {
      const { getClear } = setup({ clearable: true, value: 'abc' });
      expect(getClear()).not.toBeNull();
    });

    it('没有内容、未开启 clearable 或只读时不显示', () => {
      expect(setup({ clearable: true, value: '' }).getClear()).toBeNull();
      expect(setup({ value: 'abc' }).getClear()).toBeNull();
      expect(setup({ clearable: true, value: 'abc', readOnly: true }).getClear()).toBeNull();
    });

    it('输入内容后出现，清空后消失', () => {
      const { input, getClear } = setup({ clearable: true });
      expect(getClear()).toBeNull();

      fireEvent.change(input, { target: { value: 'a' } });
      expect(getClear()).not.toBeNull();

      fireEvent.change(input, { target: { value: '' } });
      expect(getClear()).toBeNull();
    });

    it('点击后清空内容，并依次调用 onChange("") 和 onClear', () => {
      const calls: string[] = [];
      const onChange = jest.fn((v: string) => calls.push(`onChange(${JSON.stringify(v)})`));
      const onClear = jest.fn(() => calls.push('onClear'));
      const { input, getClear } = setup({ clearable: true, value: 'abc', onChange, onClear });

      fireEvent.click(getClear()!);

      expect(input.value).toBe('');
      expect(calls).toEqual(['onChange("")', 'onClear']);
      expect(getClear()).toBeNull();
    });

    it('按下清除按钮时阻止默认行为，输入框不会失去焦点', () => {
      const { getClear } = setup({ clearable: true, value: 'abc' });

      // fireEvent 返回 false 表示事件的默认行为被 preventDefault 阻止
      expect(fireEvent.mouseDown(getClear()!)).toBe(false);
    });
  });

  describe('键盘', () => {
    it('按下回车时调用 onEnterPress', () => {
      const onEnterPress = jest.fn();
      const { input } = setup({ onEnterPress });

      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(onEnterPress).toHaveBeenCalledTimes(1);
    });

    it('按下其他键时不调用 onEnterPress', () => {
      const onEnterPress = jest.fn();
      const { input } = setup({ onEnterPress });

      fireEvent.keyDown(input, { key: 'a', code: 'KeyA' });

      expect(onEnterPress).not.toHaveBeenCalled();
    });

    it('无论按什么键都会调用 onKeyDown，回车时两个回调都会调用', () => {
      const onKeyDown = jest.fn();
      const onEnterPress = jest.fn();
      const { input } = setup({ onKeyDown, onEnterPress });

      fireEvent.keyDown(input, { key: 'a', code: 'KeyA' });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(onKeyDown).toHaveBeenCalledTimes(2);
      expect(onEnterPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('事件透传', () => {
    it('onFocus / onBlur / onClick / onKeyUp', () => {
      const handlers = { onFocus: jest.fn(), onBlur: jest.fn(), onClick: jest.fn(), onKeyUp: jest.fn() };
      const { input } = setup(handlers);

      fireEvent.focus(input);
      fireEvent.blur(input);
      fireEvent.click(input);
      fireEvent.keyUp(input, { key: 'a' });

      expect(handlers.onFocus).toHaveBeenCalledTimes(1);
      expect(handlers.onBlur).toHaveBeenCalledTimes(1);
      expect(handlers.onClick).toHaveBeenCalledTimes(1);
      expect(handlers.onKeyUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('ref 方法', () => {
    it('clear 清空内容', () => {
      const { ref, input } = setup({ value: 'abc' });

      act(() => ref.current!.clear());

      expect(input.value).toBe('');
    });

    it('setValue 设置内容', () => {
      const { ref, input } = setup();

      act(() => ref.current!.setValue('新分组'));

      expect(input.value).toBe('新分组');
    });

    it('focus / blur 控制输入框焦点', () => {
      const { ref, input } = setup();

      act(() => ref.current!.focus());
      expect(document.activeElement).toBe(input);

      act(() => ref.current!.blur());
      expect(document.activeElement).not.toBe(input);
    });
  });

  it('autoFocus 时挂载后自动获得焦点', () => {
    setup({ autoFocus: true, placeholder: 'auto' });
    expect(document.activeElement).toBe(screen.getByPlaceholderText('auto'));
  });

  describe('问题修复', () => {

    it('手机虚拟键盘按回车（code 为空、key 为 Enter）时也会调用 onEnterPress', () => {
      const onEnterPress = jest.fn();
      const { input } = setup({ onEnterPress });

      fireEvent.keyDown(input, { key: 'Enter', code: '' });

      expect(onEnterPress).toHaveBeenCalledTimes(1);
    });

    it('小键盘回车（code 为 NumpadEnter）也会调用 onEnterPress', () => {
      const onEnterPress = jest.fn();
      const { input } = setup({ onEnterPress });

      fireEvent.keyDown(input, { key: 'Enter', code: 'NumpadEnter' });

      expect(onEnterPress).toHaveBeenCalledTimes(1);
    });

    it('输入法组合输入中按回车（如中文选词）不调用 onEnterPress', () => {
      const onEnterPress = jest.fn();
      const onKeyDown = jest.fn();
      const { input } = setup({ onEnterPress, onKeyDown });

      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: true });

      expect(onEnterPress).not.toHaveBeenCalled();
      // onKeyDown 仍然照常调用，由调用方自己决定怎么处理
      expect(onKeyDown).toHaveBeenCalledTimes(1);
    });

    it('外部传入新的 value 时，输入框同步更新', () => {
      const { input, rerender } = setup({ value: 'old' });

      rerender(<Input value="new" />);

      expect(input.value).toBe('new');
    });

    it('外部 value 不变时，不会覆盖用户正在输入的内容', () => {
      const { input, rerender } = setup({ value: '' });

      fireEvent.change(input, { target: { value: 'typing' } });
      rerender(<Input value="" placeholder="re-render" />);

      expect(input.value).toBe('typing');
    });

    it('min / max / pattern 透传到 input 上', () => {
      const { input } = setup({ type: 'number', min: 1, max: 9, pattern: '\\d+' });

      expect(input.getAttribute('min')).toBe('1');
      expect(input.getAttribute('max')).toBe('9');
      expect(input.getAttribute('pattern')).toBe('\\d+');
    });

    it('不传 id 时不设置 id，避免同一页面多个输入框 id 重复', () => {
      const { container } = render(
        <>
          <Input />
          <Input />
        </>,
      );

      container.querySelectorAll('input').forEach((el) => expect(el.hasAttribute('id')).toBe(false));
    });
  });
});
