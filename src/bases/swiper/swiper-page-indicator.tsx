import React from 'react';
import cx from 'classnames';
import './styles/swiper-page-indicator.scss';

export interface SwiperPageIndicatorProps {
  current: number; //当前轮播图下标
  total: number; //轮播图数量
  indicatorClassName?: string;
}

const classPrefix = 'ygm-swiper-page-indicator';

const SwiperPageIndicator: React.FC<SwiperPageIndicatorProps> = (props) => {
  const dots: React.ReactElement[] = React.useMemo(() => {
    return Array(props.total)
      .fill(0)
      .map((_, index) => {
        return (
          <div
            key={index}
            className={cx(`${classPrefix}-dot`, { [`${classPrefix}-dot-active`]: props.current === index })}
          />
        ); //中括号?[]是计算属性名,它表示“先计算括号里表达式的值，然后把计算结果作为真正的键名”.cx?库支持传入一个对象，规则是：{ '类名': 布尔值 }。如果布尔值为?true，就保留这个类名；如果为?false，就忽略
      });
  }, [props]);

  return <div className={classPrefix}>{dots}</div>; //渲染最外层容器，并将生成的小圆点数组渲染到页面中
};

export default SwiperPageIndicator;
SwiperPageIndicator.displayName = 'SwiperPageIndicator';
