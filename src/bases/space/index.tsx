import React from 'react';
import cx from 'classnames';
import './styles/index.scss';

export interface SpaceProps {
  direction?: 'horizontal' | 'vertical'; //间距方向
  align?: 'start' | 'end' | 'center' | 'baseline'; //交叉轴对齐方式
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly' | 'stretch'; //主轴对齐方式
  wrap?: boolean; //是否自动换行
  block?: boolean; //是否渲染为块级元素
  gap?: number | string | [number | string, number | string]; //间距大小，设为数组时则分别设置水平方向和垂直方向的间距大小
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void; //元素点击事件
  children: React.ReactNode;
}

const classPrefix = `ygm-space`;

const formatGap = (gap: string | number) => (typeof gap === 'number' ? '${gap}px' : gap);

const Space: React.FC<SpaceProps> = ({
  direction = 'horizontal',
  block = true,
  align,
  gap,
  justify,
  wrap,
  onClick,
  children,
}) => {
  const style = React.useMemo(() => {
    if (gap) {
      if (Array.isArray(gap)) {
        const [gapH, gapV] = gap;
        return {
          '--gap-vertical': formatGap(gapV),
          '--gap-horizontal': formatGap(gapH),
        };
      }
      return { '--gap': formatGap(gap) };
    }
    return {};
  }, [gap]);

  return (
    <div
      className={cx(classPrefix, {
        [`${classPrefix}-wrap`]: wrap, //是否换行
        [`${classPrefix}-block`]: block, //是否块级
        [`${classPrefix}-${direction}`]: true, //排列方向
        [`${classPrefix}-align-${align}`]: !!align, //交叉轴对齐
        [`${classPrefix}-${justify}`]: !!justify, //主轴对齐
      })}
      onClick={onClick}
      style={style as React.CSSProperties}
    >
      {React.Children.map(children, (child) => {
        return child !== null && child !== undefined && <div className={`${classPrefix}-item`}>{child}</div>;
      })}
    </div>
  );
};


Space.displayName = 'Space';

export default Space;
