import React from 'react';
import './styles/index.scss';
import cx from 'classnames';
import { isPromise } from '../utils/validate';
import SpinnerLoading from '../spinner-loading';

export interface ButtonProps {
  /** 按钮颜色 */
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 按钮形状 */
  shape?: 'default' | 'rounded' | 'rectangular';
  /** 按钮填充 */
  fill?: 'solid' | 'outline' | 'none';
  children?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void> | unknown;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean | 'auto';
  loadingIcon?: React.ReactNode;
}

const classPrefix = 'ygm-button';

const Button: React.FC<ButtonProps> = ({
  color = 'default',
  size = 'middle',
  shape = 'default',
  fill = 'solid',
  children,
  className,
  block,
  disabled,
  loading = false,
  loadingIcon = <SpinnerLoading size={16} />,
  onClick,
}) => {
  const [innerLoading, setInnerLoading] = React.useState(false);
  const cloading = loading === 'auto' ? innerLoading : loading; // 当loading 为 'auto' 时，使用内部状态；否则直接使用 props.loading

  const onButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // 原生 disabled 已经会拦住点击，这里再判断一次，同时在加载中忽略点击，避免重复提交
    if (!onClick || disabled || cloading) return;

    const promise = onClick(e);
    if (isPromise(promise)) {
      try {
        setInnerLoading(true); // 开始异步操作，自动开启 Loading
        await promise; // 等待异步操作完成
        setInnerLoading(false); // 异步结束，关闭 Loading
      } catch (e) {
        setInnerLoading(false);   // 出错时同样关闭 Loading 并抛出异常
        throw e;
      }
    }
  };

  // 用原生 <button>：自带按钮语义（读屏、getByRole('button')）、能用键盘聚焦和触发，
  // disabled 时浏览器不会派发点击事件。type="button" 避免放在 <form> 里时被当成提交按钮
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={cloading || undefined}
      className={cx(
        classPrefix,
        className,
        `${classPrefix}-${color}`,
        `${classPrefix}-${size}`,
        `${classPrefix}-fill-${fill}`,
        `${classPrefix}-shape-${shape}`,
        {
          [`${classPrefix}-block`]: block,
          [`${classPrefix}-disabled`]: disabled,
        },
      )}
      onClick={onButtonClick}
    >
      {cloading ? <span className={`${classPrefix}-loading-wrap`}>{loadingIcon}</span> : children}
    </button>
  );
};

Button.displayName = 'Button';
export default Button;
