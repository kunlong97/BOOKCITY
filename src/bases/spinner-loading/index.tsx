import React from 'react';
import cx from 'classnames';
import './styles/index.scss';

export interface SpinnerLoadingProps {
  color?: 'default' | 'primary' | 'white' | 'string';
  size?: number;
}

const SpinnerLoading: React.FC<SpinnerLoadingProps> = (props) => {
  return (
    <div
      className={cx('ygm-spinner-loading', `ygm-spinner-loading-color-${props.color}`)}
      style={{ width: props.size, height: props.size }}
    ></div>
  );
};

SpinnerLoading.defaultProps = {
  color: 'default',
  size: 32,
};

export default SpinnerLoading;
