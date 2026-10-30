import React from 'react';
import Input, { InputRef } from '@/bases/input';

import { SearchOutline } from 'antd-mobile-icons';

import './styles/index.scss';

type TStyle = Partial<
  Record<'--color' | '--background' | '--search-background' | '--border-radius' | '--placeholder-color', string>
>;

export type SearchBarRef = InputRef;

export interface SearchBarProps {
  /** 输入内容 */
  value?: string;
  /** 提示文本 */
  placeholder?: string;
  /** 搜索框前缀图标 */
  icon?: React.ReactNode;
  /** 输入的最大字符数 */
  maxLength?: number;
  /** 是否显示清除图标，可点击清除文本框 */
  clearable?: boolean;
  /** 禁止输入 */
  disabled?: boolean;
  style?: React.CSSProperties & TStyle;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 点击取消按钮时触发事件 */
  onCancel?: () => void;
  /** 输入框回车键触发事件 */
  onSearch?: (val: string) => void;
  /** 输入框内容变化时触发事件 */
  onChange?: (val: string) => void;
  /** 点击清除图标时触发事件 */
  onClear?: () => void;
}

const classPrefix = 'ygm-search-bar';

const SearchBar = React.forwardRef<SearchBarRef, SearchBarProps>(
  (
    {
      value = '',
      icon = <SearchOutline />,
      clearable = true,
      cancelText = 'Cancel',
      placeholder,
      maxLength,
      disabled,
      style,
      showCancel,
      onCancel,
      onSearch,
      onChange,
      onClear,
    },
    ref,
  ) => {
    const [innerValue, setInnerValue] = React.useState<string>(value);
    const inputRef = React.useRef<SearchBarRef>(null);

    // 外部传入的 value 变化时同步
    React.useEffect(() => {
      setInnerValue(value);
    }, [value]);

    React.useImperativeHandle(
      ref,
      () => ({
        clear: () => setInnerValue(''),
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        setValue: (val: string) => setInnerValue(val),
      }),
      [],
    );

    const handleChange = (val: string) => {
      setInnerValue(val);
      onChange?.(val);
    };

    const onEnterPress = () => {
      inputRef.current?.blur();
      onSearch?.(innerValue);
    };

    return (
      <div className={classPrefix} style={style}>
        <div className={`${classPrefix}-content`}>
          <div className={`${classPrefix}-content-icon`}>{icon}</div>
          <Input
            ref={inputRef}
            className={`${classPrefix}-content-input`}
            style={{ '--placeholder-color': style?.['--placeholder-color'] }}
            placeholder={placeholder}
            value={innerValue}
            disabled={disabled}
            maxLength={maxLength}
            clearable={clearable}
            type="search"
            onChange={handleChange}
            onClear={onClear}
            onEnterPress={onEnterPress}
          />
        </div>
        {showCancel && (
          <div className={`${classPrefix}-content-cancel`} role="button" onClick={onCancel}>
            {cancelText}
          </div>
        )}
      </div>
    );
  },
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;
