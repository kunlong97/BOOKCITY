import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Grid, Space, ErrorBlock } from '@/bases';
import Loading from '@/components/loading';
import { TPageKey } from '@/pages/bookList/types';
import { px2rem } from '@/utils/unit';
import styles from './index.module.scss';
import NavBar from '@/bases/nav-bar';
import InfiniteScroll from '@/bases/infinite-scroll';
import BookCover from '@/components/bookCover/bookCover';
import useBookList from './hooks/useBookList';
import { TITLE_KEY_MAP } from './constant';

const BookList: React.FC = () => {
  const pageKey = useParams().key as TPageKey;
  const navigate = useNavigate();

  const { data, loading, error, hasMore, loadMore } = useBookList(pageKey);

  const onBack = () => {
    navigate(-1);
  };

  if (error || !TITLE_KEY_MAP[pageKey]) {
    return <ErrorBlock />;
  }

  if (loading || !data) {
    return <Loading />;
  }

  return (
    <div className={styles.bookList}>
      <NavBar onBack={onBack} leftText="Back">{TITLE_KEY_MAP[pageKey]}</NavBar>
      <div className={styles.content}>
        <InfiniteScroll hasMore={hasMore} loadMore={loadMore}>
          <Grid columns={1} gap={px2rem(24)}>
            {data?.map((item) => {
              return item.bookList.map((book) => (
                <Grid.Item key={book.bookId} onClick={() => navigate(`/book/${book.bookId}`)}>
                  <Space gap={px2rem(12)}>
                    <BookCover src={book.coverImg} alt={book.title} />
                    <Space direction="vertical" justify="between" gap={px2rem(12)}>
                      <div className={styles.bookName}>{book.title}</div>
                      <div className={styles.desc}>{book.desc}</div>
                      <div className={styles.meta}>
                        {book.author}·{book.categoryName}
                      </div>
                    </Space>
                  </Space>
                </Grid.Item>
              ));
            })}
          </Grid>
        </InfiniteScroll>
      </div>
    </div>
  );
};

export default BookList;
