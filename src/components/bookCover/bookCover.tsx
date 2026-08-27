import React from 'react';
import cx from 'classnames';

import { Image } from '@/bases';

import styles from './index.module.scss';

export interface BookCoverProps {
  src: string;
  alt: string;
  style?: React.CSSProperties & Partial<Record<'--width' | '--height' | '--border-radius', string>>;
  editMode?: boolean;
  active?: boolean;
}

const BookCover: React.FC<BookCoverProps> = React.memo((props) => {
  return (
    <div className={styles.bookCover}>
      <Image src={props.src} alt={props.alt} className={styles.coverImg} style={props.style} lazy={true} />
      {props.editMode && <i className={cx('icon-selector', styles.icon, { [styles.active]: props.active })} />}
    </div>
  );
});

export default BookCover;
