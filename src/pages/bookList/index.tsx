import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
  const location = useLocation();

  // 标题依次取：前端登记的标题 → 跳转时带过来的标题（如分类页传来的分类名）→ 通用标题。
  // 书单是否存在由接口决定（不存在时接口 404，走下面的 error 分支），不再依赖前端的标题表
  const title =
    TITLE_KEY_MAP[pageKey] ?? (location.state as { title?: string } | null)?.title ?? 'Book List';

  const { data, loading, error, loadMoreError, hasMore, loadMore, retry } = useBookList(pageKey);

  const onBack = () => {
    navigate(-1);
  };

  if (error) {
    return <ErrorBlock />;
  }

  if (loading || !data) {
    return <Loading />;
  }

  return (
    <div className={styles.bookList}>
      <NavBar onBack={onBack} leftText="Back">{title}</NavBar>
      <div className={styles.content}>
        <InfiniteScroll
          hasMore={hasMore}
          loadMore={loadMore}
          footer={
            loadMoreError ? (
              <div className={styles.loadError} onClick={retry}>
                Failed to load. Tap to retry
              </div>
            ) : undefined
          }
        >
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
