import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SearchBar, { SearchBarProps, SearchBarRef } from '..';

const setup = (props: SearchBarProps = {}) => {
  const ref = React.createRef<SearchBarRef>();
  const utils = render(<SearchBar ref={ref} {...props} />);
  const root = utils.container.querySelector('.ygm-search-bar') as HTMLElement;
  const input = utils.container.querySelector('input') as HTMLInputElement;
  const getClear = () => utils.container.querySelector('.ygm-input-clear') as HTMLElement | null;
  const getCancel = () => screen.queryByRole('button');
  return { ...utils, ref, root, input, getClear, getCancel };
};

describe('SearchBar', () => {
  describe('渲染', () => {
    it('输入框类型为 search，并显示 placeholder 和初始 value', () => {
      const { input } = setup({ placeholder: 'Search books or authors', value: '三体' });

      expect(input.type).toBe('search');
      expect(input.placeholder).toBe('Search books or authors');
      expect(input.value).toBe('三体');
    });

    it('默认在左侧显示放大镜图标', () => {
      const { container } = setup();
      expect(container.querySelector('.ygm-search-bar-content-icon svg')).not.toBeNull();
    });

    it('style 加到最外层，--placeholder-color 同时传给输入框', () => {
      const { root, input } = setup({ style: { '--background': 'white', '--placeholder-color': 'gray' } });

      expect(root.style.getPropertyValue('--background')).toBe('white');
      expect(input.style.getPropertyValue('--placeholder-color')).toBe('gray');
    });

    it('maxLength 和 disabled 传给输入框', () => {
      const { input } = setup({ maxLength: 20, disabled: true });

      expect(input.maxLength).toBe(20);
      expect(input.disabled).toBe(true);
    });
  });

  describe('输入', () => {
    it('输入时用新值调用 onChange', () => {
      const onChange = jest.fn();
      const { input } = setup({ onChange });

      fireEvent.change(input, { target: { value: '球状闪电' } });

      expect(input.value).toBe('球状闪电');
      expect(onChange).toHaveBeenCalledWith('球状闪电');
    });
  });

  describe('清除按钮', () => {
    it('默认开启：有内容时显示，点击后清空并调用 onClear', () => {
      const onClear = jest.fn();
      const { input, getClear } = setup({ onClear });
      expect(getClear()).toBeNull();

      fireEvent.change(input, { target: { value: 'abc' } });
      expect(getClear()).not.toBeNull();

      fireEvent.click(getClear()!);

      expect(input.value).toBe('');
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('clearable 为 false 时不显示清除按钮', () => {
      const { getClear } = setup({ clearable: false, value: 'abc' });
      expect(getClear()).toBeNull();
    });
  });

  describe('回车搜索', () => {
    it('按回车时用当前输入的内容调用 onSearch', () => {
      const onSearch = jest.fn();
      const { input } = setup({ onSearch });

      fireEvent.change(input, { target: { value: '三体' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSearch).toHaveBeenCalledWith('三体');
    });

    it('搜索后输入框失去焦点（收起手机键盘）', () => {
      const { input } = setup({ onSearch: jest.fn() });
      input.focus();
      expect(document.activeElement).toBe(input);

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(document.activeElement).not.toBe(input);
    });

    it('按其他键不会触发搜索', () => {
      const onSearch = jest.fn();
      const { input } = setup({ onSearch });

      fireEvent.keyDown(input, { key: 'a' });

      expect(onSearch).not.toHaveBeenCalled();
    });
  });

  describe('取消按钮', () => {
    it('默认不显示', () => {
      const { getCancel } = setup();
      expect(getCancel()).toBeNull();
    });

    it('showCancel 时显示默认文字 Cancel，点击调用 onCancel', () => {
      const onCancel = jest.fn();
      const { getCancel } = setup({ showCancel: true, onCancel });

      expect(getCancel()!.textContent).toBe('Cancel');

      fireEvent.click(getCancel()!);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('cancelText 自定义按钮文字', () => {
      const { getCancel } = setup({ showCancel: true, cancelText: '返回' });
      expect(getCancel()!.textContent).toBe('返回');
    });
  });

  describe('ref 方法', () => {
    it('focus / blur 控制输入框焦点', () => {
      const { ref, input } = setup();

      act(() => ref.current!.focus());
      expect(document.activeElement).toBe(input);

      act(() => ref.current!.blur());
      expect(document.activeElement).not.toBe(input);
    });

    it('setValue / clear 修改输入框内容', () => {
      const { ref, input } = setup();

      act(() => ref.current!.setValue('The Hobbit'));
      expect(input.value).toBe('The Hobbit');

      act(() => ref.current!.clear());
      expect(input.value).toBe('');
    });
  });
});
