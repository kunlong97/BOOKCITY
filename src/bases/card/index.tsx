import React from 'react';
import cx from 'classnames';

import './styles/index.scss';

export interface CardProps {
  /** header 左边区域 */
  title?: React.ReactNode;
  /** header 右边区域 */
  extra?: React.ReactNode;
  /** header 自定义类名 */
  headerClassName?: string;
  /** header 左边区域自定义类名 */
  titleClassName?: string;
  /** header 右边区域自定义类名 */
  extraClassName?: string;
  /** body 自定义类名 */
  bodyClassName?: string;
  /** 元素children */
  children?: React.ReactNode;
  /** header 区域点击事件 */
  onHeaderClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  /** body 区域点击事件 */
  onBodyClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

const classPrefix = 'ygm-card';

const Card: React.FC<CardProps> = (props) => {
  const renderHeader = () => {
    if (!(props.title || props.extra)) {
      return null;
    }

    return (
      <div className={cx(`${classPrefix}-header`, props.headerClassName)} onClick={props.onHeaderClick}>
        <div className={cx(`${classPrefix}-header-title`, props.titleClassName)}>{props.title}</div>
        <div className={cx(`${classPrefix}-header-extra`, props.extraClassName)}>{props.extra}</div>
      </div>
    );
  };

  const renderBody = () => {
    if (!props.children) {
      return null;
    }

    return (
      <div
        className={cx(`${classPrefix}-body`, props.bodyClassName)}
        onClick={props.onBodyClick}
        style={{ paddingTop: props.title || props.extra ? 0 : 13 }}
      >
        {props.children}
      </div>
    );
  };

  return (
    <div className={classPrefix}>
      {renderHeader()}
      {renderBody()}
    </div>
  );
};

export default Card;

Card.displayName = 'Card';
