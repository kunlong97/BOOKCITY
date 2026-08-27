import React from 'react';
import SwiperItem from './swiper-item';
import './styles/swiper.scss';
import SwiperPageIndicator from './swiper-page-indicator';

export interface SwiperProps {
  loop?: boolean; //是否循环播放
  autoplay?: boolean; //是否自动播放
  defaultIndex?: number; //默认显示第几张
  showIndicator?: boolean;
  indicatorClassName?: string;
  autoPlayInterval?: number; //自动播放间隔时间
  children: React.ReactElement | React.ReactElement[];
  style?: React.CSSProperties & Partial<Record<'--height' | '--width' | '--border-radius' | '--track-padding', string>>; //style里可以传入这几个属性，它们的默认值在swiper.scss文件里
}

const classPrefix = 'ygm-swiper';

const Swiper: React.FC<SwiperProps> = (props) => {
  const [currentIndex, setCurrentIndex] = React.useState<number>(props.defaultIndex || 0); //轮播图当前播放到第几张
  const startRef = React.useRef<number>(0);
  const slideRatioRef = React.useRef<number>(0);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const autoPlaying = React.useRef<boolean>(false); //当前是否正在播放中
  const intervalRef = React.useRef<number>(0);

  //用来判断<Swpier>组件中的children是不是Swiper.Item类型
  const { count } = React.useMemo(() => {
    let count = 0;
    const validChildren = React.Children.map(props.children, (child) => {
      //验证对象是否是一个React元素
      if (!React.isValidElement(child)) return null; //Recat.isValidElement(child)判断传入的child是否是一个React组件
      //验证是否是一个SwiperItem类型
      if (child.type !== SwiperItem) {
        //判断这个组件是否是SwiperItem
        console.warn('Swiper children must be Swiper.Item components');
      }
      count++;
      return child;
    });
    return { validChildren, count };
  }, [props.children]);

  const getFinalPosition = (index: number) => {
    const finalPosition = -currentIndex * 100 + index * 100;
    return finalPosition;
  };

  const renderSwiperItem = () => {
    //因为用的使用了列表渲染
    return (
      <div className={`${classPrefix}-track-inner`}>
        {React.Children.map(props.children, (child, index) => {
          //React.Children.map是React官方提供的遍历子元素的方法,map()接收三个参数,父组件标签内包裹的所有子节点,一个回调函数(这个回调函数接收两个参数：第一个参数：当前正在处理的子节点（child）第二个参数：当前子节点的下标（index），从?0?开始自增。返回值要求必须返回一个 React 节点),第三个参数可选
          const position = getFinalPosition(index); //通过index计算出图片的位置

          return (
            <div
              className={`${classPrefix}-slide`}
              style={{ left: `-${index * 100}%`, transform: `translate3d(${position}%, 0, 0)` }}
            >
              {child}
            </div> //动画是通过transform里的translate3d属性实现的
          );
        })}
      </div>
    );
  };

  const getSlideRatio = (diff: number) => {
    //计算滑动距离占整个容器宽度的比例
    const element = trackRef.current;
    if (!element) return 0;
    return diff / element.offsetWidth;
  };

  const boundIndex = React.useCallback((currentIndex: number) => {
    //第一张不能再向右滑动，最后一张不能再向左滑动
    let min = 0;
    let max = React.Children.count(props.children) - 1;
    let ret = currentIndex;
    ret = Math.max(ret, min);
    ret = Math.min(ret, max);
    return ret;
  }, [count]);

  const swipeTo = React.useCallback((index: number) => {
    const targetIndex = boundIndex(index);
    setCurrentIndex(targetIndex);
  }, [boundIndex]);

  //切换到下一张
  const swipeNext = React.useCallback(() => {
    swipeTo(currentIndex + 1);
  }, [swipeTo, currentIndex]);

  const onTouchEnd = () => {
    //这个是原生的事件
    const index = Math.round(slideRatioRef.current);
    slideRatioRef.current = 0;

    const position = currentIndex + index;

    swipeTo(position);

    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  };

  const onTouchMove = (e: TouchEvent) => {
    //这个是原生的事件
    const currentX = e.changedTouches[0].clientX;
    const diff = startRef.current - currentX; //鼠标初始点击的位置减去滑动后位置，就是滑动的位置
    slideRatioRef.current = getSlideRatio(diff);

    const position = currentIndex + slideRatioRef.current; //当前轮播图所在的索引+手指滑动距离占整个屏幕宽度的比例（小数）

    setCurrentIndex(position);
  };
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    //这个是recat的事件
    startRef.current = e.changedTouches[0].clientX; // 记录手指刚按下时的 X 轴坐标
    document.addEventListener('touchmove', onTouchMove); //按下时绑定全局监听手指的滑动（touchmove）事件,如果只给容器绑定事件,当滑出容器时事件会消失,给全局绑滑到哪里都会有事件,用户体验更佳
    document.addEventListener('touchend', onTouchEnd);
  };

  //添加自动播放定时器
  React.useEffect(() => {
    if (!props.autoplay) return;
    intervalRef.current = window.setInterval(() => {
      autoPlaying.current = true;
      swipeNext();
    }, props.autoPlayInterval);

    return () => {
      clearInterval(intervalRef.current);
    };
  });

  return (
    <div className={classPrefix} style={props.style}>
      <div className={`${classPrefix}-track`} onTouchStart={onTouchStart} ref={trackRef}>
        {renderSwiperItem()}
      </div>

      {props.showIndicator && (
        <div className={`${classPrefix}-indicator`}>
          <SwiperPageIndicator
            total={count}
            current={slideRatioRef.current > 0 ? Math.floor(currentIndex) : Math.ceil(currentIndex)}
            indicatorClassName={props.indicatorClassName}
          />
        </div>
        
      )}
    </div>
  );
};

export default Swiper;

Swiper.defaultProps = {  
   loop: false,
   autoplay: false,
   defaultIndex: 0,
   showIndicator: true,
   autoPlayInterval: 2000,   //默认轮播间隔时间3秒
}

Swiper.displayName = 'Swiper';
