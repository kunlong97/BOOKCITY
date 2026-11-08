import { memo } from 'react';
import styles from './index.module.scss';
import { Grid } from '@/bases';
import { px2rem } from '@/utils/unit';
import BookList from './components/bookList';
import useShelf from '@/features/shelf/hooks/useShelf';
import GroupList from './components/groupList';

// 用具名函数而不是箭头函数，React DevTools 里才能显示组件名 List
// eslint-disable-next-line prefer-arrow-callback
const List = memo(function List() {
  const { books } = useShelf();

  return (
    <div className={styles.list}>
      <Grid columns={3} gap={px2rem(20)}>
        <GroupList />
        <BookList bookList={books} />
      </Grid>
    </div>
  );
});

export default List;
