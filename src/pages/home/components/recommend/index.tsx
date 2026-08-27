import React from 'react';
import styles from './index.module.scss';
import { Card, Grid } from '@/bases';
import { IBookInfo } from '@/types/book';
import { px2rem } from '@/utils/unit';
import { useNavigate } from 'react-router-dom';
import BookCover from '@/components/bookCover/bookCover';
import Space from '@/bases/space';

interface IRecommendProps {
  books: IBookInfo[];
}

const Recommend: React.FC<IRecommendProps> = React.memo(({ books }) => {
  const navigate = useNavigate();

  const onHeaderClick = () => {
    navigate('/book-list/popular');
  };

  const renderContent = () => {
    return books.map((book) => {
      return (
        <React.Fragment key={book.bookId}>
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

  return (
    <div className={styles.recommend}>
      <Card title="Today's Picks" extra="More" onHeaderClick={onHeaderClick} headerClassName={styles.header}>
        <Grid columns={4} gap={px2rem(16)}>
          {renderContent()}
        </Grid>
      </Card>
    </div>
  );
});

export default Recommend;
