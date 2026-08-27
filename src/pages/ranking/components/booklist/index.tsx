import useRequest from '@/hooks/useRequest/useRequest';
import styles from './index.module.scss';
import { IBookInfo } from '@/types/book';
import api from '../../api';
import { Grid, Space } from '@/bases';
import { useNavigate } from 'react-router-dom';
import { px2rem } from '@/utils/unit';
import BookCover from '@/components/bookCover/bookCover';

export interface BookListProps {
  gender: 'male' | 'female';
  id: string;
}

const BookList: React.FC<BookListProps> = (props) => {
  const { data } = useRequest<IBookInfo[]>({
    url: api.getBookList({ gender: props.gender, key: props.id }),
  });

  const navigate = useNavigate();

  return (
    <div className={styles.rankingBookList}>
      <Grid columns={1} gap={px2rem(24)}>
        {data?.map((book) => {
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
