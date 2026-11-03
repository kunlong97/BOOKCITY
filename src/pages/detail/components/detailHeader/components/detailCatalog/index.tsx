import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.scss';
import { Popup, Space } from '@/bases';
import { useBookDetailContext } from '@/features/bookDetail/context';
import BookCatalogList from '@/components/bookCatalogList';

const Catalog: React.FC = React.memo(() => {
  const [visible, setVisible] = useState<boolean>(false);
  const book = useBookDetailContext();
  const navigate = useNavigate();

  const latestChapters = useMemo(() => {
    return book.chapters?.slice(-3).reverse(); //取出最新三章,倒序排列
  }, [book.chapters]);

  const onShow = () => {
    setVisible(true);
  };
  const onCancel = () => {
    setVisible(false);
  };

  // 点目录里的章节：关闭目录，进入该章节的阅读页（chapter 从 1 开始）
  const onClickChapter = (chapter: number) => {
    setVisible(false);
    navigate(`/book/${book.bookId}/${chapter}`);
  };

  return (
    <div className={styles.catalog}>
      <Space direction="vertical">
        {latestChapters?.map((name: string) => {
          return (
            <div key={name} className={styles.catalogItem}>
              {name}
            </div>
          );
        })}
      </Space>

      <div className={styles.catalogBtn} onClick={onShow}>
        <div className={styles.icon}>
          <i className="icon-catalog" />
        </div>
        <div>Catalog</div>
      </div>

      <Popup visible={visible} onMaskClick={onCancel}>
        <BookCatalogList
          catalogList={book.chapters!}
          author={book.author}
          title={book.title}
          imgUrl={book.coverImg}
          bookId={book.bookId}
          onClickChapter={onClickChapter}
        />
      </Popup>
    </div>
  );
});

export default Catalog;
