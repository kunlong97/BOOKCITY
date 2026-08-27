import React from 'react';

import './styles/grid-item.scss';

export interface GridItemProps {

  span?: number;   //跨度
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;   //点击事件
  children: React.ReactNode;
}

const classPrefix = 'ygm-grid-item';

const GridItem: React.FC<GridItemProps> = React.memo((props) => {
  const style = React.useMemo(() => {
    return {
      '--item-span': props.span,
    };
  }, [props.span]);

  return (
    <div className={classPrefix} style={style as React.CSSProperties} onClick={props.onClick}>
      {props.children}
    </div>
  );
});

export default GridItem;
