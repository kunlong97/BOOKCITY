import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

import useIsomorphicLayoutEffect from '@/hooks/useIsomorphicLayout';

import useScrollLock from '@/hooks/useScrollLock';

import './styles/index.scss';

export interface MaskProps {
 /** 是否可见 */
 visible: boolean;
 /** 点击蒙层触发回调 */
 onMaskClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
 style?: React.CSSProperties & Partial<Record<'--z-index' | '--background', string>>;
}

const classPrefix = 'ygm-mask';

const Mask: React.FC<MaskProps> = (props) => {

   const [active, setActive] = useState<boolean>(props.visible)

   useScrollLock(props.visible);   //用于滚动条滚动，在下面封装

   const {opacity} = useSpring({
      opacity: props.visible? 1 : 0,
      config: {
         tension: 250,
         friction: 30,
         clamp: true
      },
      onRest: () => {
         setActive(props.visible);
      }
   })

   useIsomorphicLayoutEffect(() => {   //渲染之前执行。蒙板Mask组件在Popup弹出之前出现
      if(props.visible){
         setActive(true)
      }
   }, [props.visible])

   const onMask = (e:React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      e.stopPropagation();   //阻止冒泡
      props.onMaskClick?.(e);
   }

 return (
      <animated.div className={classPrefix} style={{
         ...props.style, opacity, display: active ? undefined : 'none',
      }} onClick={onMask} />
 );
};

export default Mask;

Mask.displayName = 'Mask';