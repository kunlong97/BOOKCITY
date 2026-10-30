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
// rem 布局下行高是小数，浏览器渲染出的行盒高度会有亚像素误差（如 14.0168 渲染成 14.0199），
// 比较高度时要留出容差，否则刚好占满 rows 行的文本也会被判定为超出
const heightTolerance = 1;

const Ellipsis: React.FC<EllipsisProps> = ({ text = '', rows = 1, collapse, expand }) => {
  const [exceeded, setExceeded] = useState<boolean>(false); //控制文本是否溢出，决定是否需要截断
  const [expanded, setExpanded] = useState<boolean>(false); //控制当前是展开还是收起状态，默认收起，按 rows 显示
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
    const maxHeight = lineHeight * rows + heightTolerance;
    const height = container.getBoundingClientRect().height; //Element.getBoundingClientRect()?方法用于获取元素的大小及其相对于视口的位置，返回一个?DOMRect?对象，包含?x,?y,?width,?height,?top,?right,?bottom,?left?等只读属性。

    // 展开文字只有是字符串时才能放进影子容器测量
    const expandText = typeof expand === 'string' ? ` ${expand}` : '';

    //二分法：找到能放入省略号和展开文字且不超过限制高度的最大文本长度
    const findMaxLength = () => {
      let low = 0;
      let high = text.length;

      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        container.innerText = `${text.slice(0, mid)}${ellipsisTailing}${expandText}`;

        if (container.getBoundingClientRect().height > maxHeight) {
          high = mid - 1;
        } else {
          low = mid;
        }
      }
      return low;
    };

    if (maxHeight >= height) {
      setExceeded(false);
    } else {
      setExceeded(true);
      setEllpsised(text.slice(0, findMaxLength()));
    }

    // 测量完移除影子容器，否则每次计算都会在 body 里多留一个节点
    document.body.removeChild(container);
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
            {text}
            {collapse && <a> {collapse}</a>}
          </>
        );

        //情况3：文本溢出，且当前处于“收起”状态（展示截断文本）
      } else {
        return (
          <>
            {ellpsised}
            {ellipsisTailing}
            {expand && <a> {expand}</a>}
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
