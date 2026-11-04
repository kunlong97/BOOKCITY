import useRequest from '@/hooks/useRequest/useRequest';
import styles from './index.module.scss';
import { IBookInfo } from '@/types/book';
import api from '../../api';
import { Grid, Space, SpinnerLoading } from '@/bases';
import { useNavigate } from 'react-router-dom';
import { px2rem } from '@/utils/unit';
import BookCover from '@/components/bookCover/bookCover';

export interface BookListProps {
  id: string;
}

const BookList: React.FC<BookListProps> = (props) => {
  const { data, error, mutate } = useRequest<IBookInfo[]>({
    url: api.getBookList(props.id),
  });

  const navigate = useNavigate();

  // 加载失败时提示并允许重试，否则右侧是一片空白，用户分不清是在加载、没有数据还是出错了
  if (error) {
    return (
      <div className={styles.rankingBookList}>
        <div className={styles.loadError} onClick={() => mutate()}>
          Failed to load. Tap to retry
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.rankingBookList}>
        <div className={styles.loading}>
          <SpinnerLoading size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rankingBookList}>
      <Grid columns={1} gap={px2rem(24)}>
        {data.map((book) => {
          return (
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
          );
        })}
      </Grid>
    </div>
  );
};

export default BookList;
