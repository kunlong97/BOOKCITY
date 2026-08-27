import { useCallback, useRef, useState } from 'react';
import { pxToNumber } from './utils';
import { useIsomorphicLayoutEffect } from '@react-spring/web';
import useResizeObserver from '@/hooks/useResizeObserver';

export interface EllipsisProps {
  /** 文本内容 */
  text: string;
  /** 展示几行 */
  rows?: number;
  /** 收起操作元素 */
  collapse?: React.ReactNode;
  /** 展开操作元素 */
  expand?: React.ReactNode;
}

const classPrefix = 'ygm-ellipsis';
const ellipsisTailing = '...';

const Ellipsis: React.FC<EllipsisProps> = ({ text = '', rows = 1, collapse, expand }) => {
  const [exceeded, setExceeded] = useState<boolean>(false); //控制文本是否溢出，决定是否需要截断
  const [expanded, setExpanded] = useState<boolean>(true); //控制当前是展开还是收起状态
  const [ellpsised, setEllpsised] = useState<string>(''); //存储经过二分查找计算后，需要展示的截断文本

  const containerRef = useRef<HTMLDivElement>(null);

  //检测文本是否溢出，并计算截断后的文本
  const calcEllipsised = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;

    const originStyle = window.getComputedStyle(element);
    //Window.getComputedStyle()?方法返回元素的所有CSS属性的最终计算值。是一个伪数组

    // 2. 创建一个隐藏的“影子容器”，用于在不影响页面的情况下测量文本高度
    const container = document.createElement('div');
    const styleNames: string[] = Array.from(originStyle); //从可迭代或类数组对象创建一个新的浅拷贝的数组实例。

    // 将原容器的所有样式复制到影子容器，确保测量环境一致
    styleNames.forEach((name) => {
      container.style.setProperty(name, originStyle.getPropertyValue(name));
    });

    // 设置影子容器的文本和测量属性
    container.innerText = text;
    container.style.height = 'auto';
    container.style.position = 'fixed';
    container.style.visibility = 'hidden';
    document.body.appendChild(container);

    const lineHeight = pxToNumber(originStyle.lineHeight);
    const maxHeight = lineHeight! * rows!;
    const height = container.getBoundingClientRect().height; //Element.getBoundingClientRect()?方法用于获取元素的大小及其相对于视口的位置，返回一个?DOMRect?对象，包含?x,?y,?width,?height,?top,?right,?bottom,?left?等只读属性。

    const check = (left: number, right: number) => {
      //二分法
      let l = left;
      let r = right;
      let text = '';

      //找到能放入省略号和展开字符且不超限的最大文本长度
      while (l < r) {
        const m = Math.floor((l + r) / 2);
        if (l === m) {
          break;
        }
        const tempText = text.slice(l, m);
        container.innerText = `${text}${tempText}${ellipsisTailing}${expand}`;
        const height = container.getBoundingClientRect().height;

        if (height > maxHeight) {
          r = m;
        } else {
          l = m;
          text = `${text}${tempText}`;
        }
      }
      return text;
    };

    if (maxHeight >= height) {
      setExceeded(false);
    } else {
      setExceeded(true);
      const ellipsisedValue = check(0, text.length);
      setEllpsised(ellipsisedValue);
    }
  }, [expand, rows, text]);

  useIsomorphicLayoutEffect(() => {
    calcEllipsised();
  }, [calcEllipsised]);

  useResizeObserver(calcEllipsised, containerRef);   //页面尺寸发生变化时,重新计算

  const renderContent = () => {
    // 情况1：文本没有溢出，直接展示完整文本
    if (!exceeded) {
      return text;
    } else {
      // 情况2：文本溢出,且当前处于“展开”状态
      if (expanded) {
        return (
          <>
            {text};{collapse && <a> collapse</a>}
          </>
        );

        //情况3：文本溢出，且当前处于“收起”状态（展示截断文本）
      } else {
        return (
          <>
            {ellpsised}
            {ellipsisTailing}
            {expand && <a> expand</a>}
          </>
        );
      }
    }
  };

  const onContent = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); ////阻止事件冒泡

    if (!expand && !collapse) return;
    if (expand && !collapse) {
      setExpanded(true);
      return;
    }
    setExpanded(!expanded);
  };

  return (
    <div className={classPrefix} ref={containerRef} onClick={onContent}>
      {renderContent()}
    </div>
  );
};

Ellipsis.displayName = 'Ellipsis';
export default Ellipsis;
