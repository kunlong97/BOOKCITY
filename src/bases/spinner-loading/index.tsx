import React from 'react';
import cx from 'classnames';
import './styles/index.scss';

export interface SpinnerLoadingProps {
  color?: 'default' | 'primary' | 'white' | 'string';
  size?: number;
}

const SpinnerLoading: React.FC<SpinnerLoadingProps> = ({ color = 'default', size = 32 }) => {
  return (
    <div
      className={cx('ygm-spinner-loading', `ygm-spinner-loading-color-${color}`)}
      style={{ width: size, height: size }}
    ></div>
  );
};

export default SpinnerLoading;
