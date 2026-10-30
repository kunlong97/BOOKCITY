import React from 'react';
import cx from 'classnames';
import { CloseCircleFill } from 'antd-mobile-icons';
import './styles/index.scss';

type TStyle = Partial<Record<'--color' | '--placeholder-color', string>>;

export interface InputRef {
  clear: () => void;
  focus: () => void;
  blur: () => void;
  setValue: (val: string) => void;
}

export interface InputProps {
  id?: string;
  value?: string;
  placeholder?: string;
  className?: string;
  /** 是否显示清除icon */
  clearable?: boolean;
  style?: React.CSSProperties & TStyle;
  autoFocus?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  minLength?: number;
  max?: number;
  min?: number;
  pattern?: string;
  name?: string;
  autoComplete?: 'on' | 'off';
  autoCapitalize?: 'on' | 'off';
  autoCorrect?: 'on' | 'off';
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  type?: React.HTMLInputTypeAttribute;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLInputElement>;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
  onEnterPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange?: (val: string) => void;
  onClear?: () => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const classPrefix = `ygm-input`;

const Input = React.forwardRef<InputRef, InputProps>(
  (
    {
      id,
      value,
      placeholder,
      clearable,
      style,
      autoFocus,
      disabled,
      readOnly,
      maxLength,
      minLength,
      max,
      min,
      pattern,
      name,
      autoComplete = 'off',
      autoCapitalize = 'off',
      autoCorrect = 'off',
      inputMode,
      type = 'text',
      onKeyDown,
      onKeyUp,
      onClick,
      onEnterPress,
      onChange,
      onClear,
      onFocus,
      onBlur,
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = React.useState<string>(value ?? '');
    const nativeInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
      setInputValue(value ?? '');
    }, [value]);

    React.useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          setInputValue('');
        },
        focus: () => {
          nativeInputRef.current?.focus();
        },
        blur: () => {
          nativeInputRef.current?.blur();
        },
        setValue: (val: string) => {
          setInputValue(val);
        },
      }),
      [],
    );

    const handleKeydown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (onEnterPress && e.key === 'Enter') {
          onEnterPress(e);
        }
        onKeyDown?.(e);
      },
      [onEnterPress, onKeyDown],
    );

    const showClear = clearable && !!inputValue && !readOnly;

    return (
      <div className={cx(classPrefix, { [`${classPrefix}-disabled`]: disabled })}>
        <input
          ref={nativeInputRef}
          id={id}
          style={style}
          className={`${classPrefix}-element`}
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={inputValue}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          minLength={minLength}
          max={max}
          min={min}
          pattern={pattern}
          autoComplete={autoComplete}
          inputMode={inputMode}
          type={type}
          name={name}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onKeyDown={handleKeydown}
          onKeyUp={onKeyUp}
          onClick={onClick}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange?.(e.target.value);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
        />

        {showClear && (
          <div
            className={`${classPrefix}-clear`}
            // 阻止默认行为，点击清除按钮时输入框不会失去焦点
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={() => {
              setInputValue('');
              // 清空也是一次值的变化，要通知外层，否则外层保存的还是清空前的值
              onChange?.('');
              onClear?.();
            }}
          >
            <CloseCircleFill />
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
