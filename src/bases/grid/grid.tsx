import React from 'react';
import './styles/grid.scss';

export interface GridProps {
  columns: number; //列数
  gap?: number | string | [number | string, number | string]; //列/行间距
  children?: React.ReactNode; //子元素
}

const formatGap = (gap: string | number) => {
  //处理传入的间距是number或string类型时的情况
  return typeof gap === 'number' ? `${gap}px` : gap ;
};

const classPrefix = 'ygm-grid';

const Grid: React.FC<GridProps> = (props) => {
  const style = React.useMemo(() => {
    if (props.gap !== undefined) {
      //传入gap
      if (Array.isArray(props.gap)) {
        const [gapH, gapV] = props.gap;
        return {
          '--column-gap': gapH,
          '--row-gap': gapV,
          '--columns': props.columns,
        };
      } else {
        return { '--gap': formatGap(props.gap), '--columns': props.columns };
      }
    }
    //没有传入gap
    return { '--columns': props.columns };   
  }, [props.columns, props.gap]);

  return (
    <div className={classPrefix} style={style as React.CSSProperties}>
      {props.children}
    </div>
  );
};

export default Grid;
