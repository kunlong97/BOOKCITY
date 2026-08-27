import React from 'react';

import { Space } from '@/bases';
import BookCover from '../bookCover/bookCover';

import styles from './index.module.scss';

interface BookCatalogListProps {
  catalogList: string[];
  imgUrl: string;
  title: string;
  author: string;
  bookId: string;
  onClickChapter?: (chapter: number) => void;
}

const BookCatalogList: React.FC<BookCatalogListProps> = React.memo((props) => {
  const onGoChapter = (index: number) => {
    props?.onClickChapter?.(index + 1);
  };
  return (
    <div className={styles.catalogList}>
      <div className={styles.header}>
        <Space>
          <BookCover src={props.imgUrl} alt={props.title} />
          <div className={styles.meta}>
            <div className={styles.title}>{props.title}</div>
            <div className={styles.author}>{props.author}</div>
          </div>
        </Space>
      </div>
      <div className={styles.content}>
        {props.catalogList?.map((item, index) => (
          <div key={item} className={styles.catalogItem} onClick={() => onGoChapter(index)}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
});

export default BookCatalogList;
