import React from 'react';
import styles from './index.module.scss';
import { Space } from '@/bases';
import { px2rem } from '@/utils/unit';
import BookCover from '@/components/bookCover/bookCover';
import { useBookDetailContext } from '@/features/bookDetail/context';
import Ellipsis from '@/bases/ellipsis';

const DetailBookInfo: React.FC = React.memo(() => {
  const book = useBookDetailContext();
  const series = book.isSerial ? 'Ongoing' : 'Completed';

  return (
    <div className={styles.bookInfo}>
      <Space gap={px2rem(12)}>
        <BookCover
          src={book.coverImg}
          alt={book.title}
          style={{ '--width': px2rem(84), '--height': px2rem(112) }}
        />
        <Space direction="vertical" justify="center" gap={px2rem(10)}>
          <div className={styles.bookName}>{book.title}</div>
          <div className={styles.author}>{book.author}</div>
          <div className={styles.category}>{book.categoryName}</div>
          <div className={styles.meta}>
            {book.wordCount} million words / {series}
          </div>
        </Space>
      </Space>
      <div className={styles.desc}>
        <Ellipsis text={book.desc} rows={2} expand="【expand】" collapse="【collapse】" />
      </div>
    </div>
  );
});

export default DetailBookInfo;
