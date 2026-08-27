import React from 'react';
import styles from './index.module.scss';
import { Card, Countdown, Grid } from '@/bases';
import { px2rem } from '@/utils/unit';
import { useNavigate } from 'react-router-dom';
import { IBookInfo } from '@/types/book';
import BookCover from '@/components/bookCover/bookCover';
import Space from '@/bases/space';

interface ILimitedReaderProps {
  books: IBookInfo[];
}

const LimitedReader: React.FC<ILimitedReaderProps> = React.memo(({ books }) => {
  const navigate = useNavigate();

  const renderContent = () => {
    return books.map((book) => {
      return (
        <React.Fragment key={book.bookId} >
          <Grid.Item onClick={() => navigate(`/book/${book.bookId}`)}>
            <BookCover src={book.coverImg} alt={book.title} />
            <Space direction="vertical" gap={px2rem(6)}>
              <div className={styles.bookName}>{book.title}</div>
              <div className={styles.author}>{book.author}</div>
            </Space>
          </Grid.Item>
        </React.Fragment>
      );
    });
  };

  const header = React.useMemo(() => {
    return (
      <div className={styles.headerLeft}>
        <div className={styles.title}>Free for a limited time</div>
        <div className={styles.divider}>|</div>
        <Countdown numberClassName={styles.num} symbolClassName={styles.symbol} time={10600000} format='hh:mm:ss'/>
      </div>
    );
  }, []);

  return (
    <div className={styles.limited}>
      <Card headerClassName={styles.header} title={header}></Card>
      <Grid columns={4} gap={px2rem(16)}>
        {renderContent()}
      </Grid>
    </div>
  );
});

export default LimitedReader;
