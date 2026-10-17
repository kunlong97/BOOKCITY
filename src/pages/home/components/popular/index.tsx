import React from 'react';
import styles from './index.module.scss';
import { useNavigate } from 'react-router-dom';
import { px2rem } from '@/utils/unit';
import { IBookInfo } from '@/types/book';
import Space from '@/bases/space';
import BookCover from '@/components/bookCover/bookCover';
import { Card, Grid } from '@/bases';

interface IPopularProps {
  books: IBookInfo[];
}

const Popular: React.FC<IPopularProps> = React.memo(({ books }) => {
  const navigate = useNavigate();

  const onHeaderClick = () => {
    navigate('/book-list/hotpicks');
  };

  const renderContent = () => {
    return books.map((book) => {
      return (
        <Grid.Item key={book.bookId} onClick={() => navigate(`/book/${book.bookId}`)}>
          <Space direction="horizontal" gap={px2rem(12)}>
            <BookCover src={book.coverImg} alt={book.title} />
            <Space direction="vertical" gap={px2rem(14)}>
              <div className={styles.bookName}>{book.title}</div>
              <div className={styles.desc}>{book.desc}</div>
              <div className={styles.meta}>
                {book.author}·{book.categoryName}
              </div>
            </Space>
          </Space>
        </Grid.Item>
      );
    });
  };

  return (
    <div className={styles.popular}>
      <Card title="Hot Picks" extra="More" onHeaderClick={onHeaderClick} headerClassName={styles.header}>
        <Grid columns={1} gap={px2rem(24)}>
          {renderContent()}
        </Grid>
      </Card>
    </div>
  );
});

export default Popular;
