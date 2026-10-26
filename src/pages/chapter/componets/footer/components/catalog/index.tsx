import { Popup } from '@/bases';
import BookCatalogList from '@/components/bookCatalogList';
import { setCatalogVisible } from '@/pages/chapter/chapterSlice';
import BookDetailContext from '@/features/bookDetail/context';
import { useAppDispatch, useAppSelector } from '@/store/store';
import React, { useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ChapterFooterCatalog: React.FC = React.memo(() => {

  const navigate = useNavigate();
  const { bookId } = useParams();

  // 书籍数据由 ChapterFooter 统一请求、通过 Context 下发，这里不再自己发请求。
  // book 在数据加载完成前是 null，和重构前 `data` 首次渲染是 undefined 的语义一致。
  const book = useContext(BookDetailContext);

  const dispatch = useAppDispatch();
  const catalogVisible = useAppSelector<boolean>((state) => state.Chapter.catalogVisible);

  const onMaskClick = () => {
    dispatch(setCatalogVisible(false));
  };

  //跳转到指定章节
  const onClickChapter = (chapter:number) => {
    navigate(`/book/${bookId}/${chapter}`, {replace: true});
    dispatch(setCatalogVisible(false));
  }

  return (
    <Popup mask visible={catalogVisible} position="left" onMaskClick={onMaskClick}>
      {book && (
        <BookCatalogList
          catalogList={book.chapters!}
          author={book.author}
          title={book.title}
          imgUrl={book.coverImg}
          bookId={book.bookId}
          onClickChapter={onClickChapter}
        />
      )}
    </Popup>
  );
});

export default ChapterFooterCatalog;
