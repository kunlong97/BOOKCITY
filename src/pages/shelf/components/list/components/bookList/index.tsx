import { Grid, Space } from '@/bases';
import { IBookInfo } from '@/types/book';
import { px2rem } from '@/utils/unit';
import React, { memo } from 'react';
import styles from './index.module.scss';
import BookCover from '@/components/bookCover/bookCover';
import { useAppSelector } from '@/store/store';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/store/store';
import { setSelectedBook } from '@/pages/shelf/shelfSlice';

export interface IBookList {
  bookList: IBookInfo[];
}

const BookList: React.FC<IBookList> = memo((props) => {
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const editMode = useAppSelector(state => state.Shelf.editMode);
  const selectedBook = useAppSelector(state => state.Shelf.selectedBook)

  const onBook = (book: IBookInfo) => {

    // 非"编辑"模式,点击书籍跳转到书籍详情页
    if (!editMode) {
      navigate(`/book/${book.bookId}`);

    // "编辑"模式,点击书籍选中书籍  
    }else{
      dispatch(setSelectedBook(book));
    }
  };

  const getBookActive = (bookId: string) => {
    const index = selectedBook.findIndex(book => book.bookId === bookId)
    return index === -1 ? false : true;
  };

  return (
    <>
      {props.bookList.map((book) => {
        return (
          <React.Fragment key={book.bookId}>
            <Grid.Item onClick={() => onBook(book)}>
              <BookCover
                src={book.coverImg}
                alt={book.title}
                style={{ '--width': px2rem(96), '--height': px2rem(130) }}
                editMode={editMode}
                active={getBookActive(book.bookId)}
              />
              <Space direction="vertical" gap={px2rem(6)}>
                <div className={styles.bookName}>{book.title}</div>
                <div className={styles.author}>{book.author}</div>
              </Space>
            </Grid.Item>
          </React.Fragment>
        );
      })}
    </>
  );
});

export default BookList;
