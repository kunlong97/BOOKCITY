import React from 'react';
import './styles/index.scss';
import ErrorImage from './errorImage';

export interface ErrorBlockProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  image?: React.ReactNode;
}

const classPrefix = 'ygm-error-block';

const ErrorBlock: React.FC<ErrorBlockProps> = ({
  title = 'Something went wrong with this page.',
  description = 'Please try again later.',
  image,
}) => {
  let imageNode: React.ReactNode = ErrorImage;

  if (image) {
    imageNode = image; //使用传入的图片
  }

  return (
    <div className={classPrefix}>
      <div className={`${classPrefix}-image`}>{imageNode}</div>
      <div className={`${classPrefix}-description`}>
        <div className={`${classPrefix}-description-title`}>{title}</div>
        <div className={`${classPrefix}-description-subtitle`}>{description}</div>
      </div>
    </div>
  );
};

export default ErrorBlock;
