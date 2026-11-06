import React from 'react';

import useIntersectionObserver from '@/hooks/useIntersectionObserver';

export interface ImageProps {
  /** 图片地址 */
  src: string;
  /** 图片描述 */
  alt?: string;
  /** 图片宽度 */
  width?: number | string;
  /** 图片高度 */
  height?: number | string;
  /** 加载时的占位图地址 */
  loading?: string;
  style?: React.CSSProperties;
  /** 是否懒加载 */
  lazy?: boolean;
  /** 图片填充模式 */
  fit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  className?: string;
  /** 图片点击事件 */
  onClick?: (event: React.MouseEvent<HTMLImageElement, Event>) => void;
  /** 图片加载失败时回调 */
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  /** 图片加载完成时回调 */
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const Image: React.FC<ImageProps> = ({
  alt = '',
  width = '100%',
  height = '100%',
  lazy = false,
  fit = 'fill',
  loading = 'data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mM8/x8AAqMB0Fk+W34AAAAASUVORK5CYII=',
  src,
  style,
  className,
  onClick,
  onError,
  onLoad,
}) => {
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const observerEntry = useIntersectionObserver(imageRef, { freezeOnceVisible: true });
  return (
    <img
      className={className}
      ref={imageRef}
      src={(observerEntry?.isIntersecting || !lazy) ? src : loading}
      alt={alt}
      // fit 放在前面作为默认值，调用方在 style 里显式写的 objectFit 优先生效
      style={{ objectFit: fit, ...style }}
      width={width}
      height={height}
      onClick={onClick}
      onError={onError}
      onLoad={onLoad}
      draggable={false}
    />
  );
};

Image.displayName = 'Image';

export default Image;
