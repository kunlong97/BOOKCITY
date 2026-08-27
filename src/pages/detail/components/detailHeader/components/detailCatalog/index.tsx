import React, { useMemo, useState } from 'react';
import styles from './index.module.scss';
import { Popup, Space } from '@/bases';
import { useBookDetailContext } from '@/features/bookDetail/context';
import BookCatalogList from '@/components/bookCatalogList';

const Catalog: React.FC = React.memo(() => {
  const [visible, setVisible] = useState<boolean>(false);
  const book = useBookDetailContext();

  const latestChapters = useMemo(() => {
    return book.chapters?.slice(-3).reverse(); //取出最新三章,倒序排列
  }, [book.chapters]);

  const onShow = () => {
    setVisible(true);
  };
  const onCancel = () => {
    setVisible(false);
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
        <div>目录</div>
      </div>

      <Popup visible={visible} onMaskClick={onCancel}>
        <BookCatalogList
          catalogList={book.chapters!}
          author={book.author}
          title={book.title}
          imgUrl={book.coverImg}
          bookId={book.bookId}
        />
      </Popup>
    </div>
  );
});

export default Catalog;
