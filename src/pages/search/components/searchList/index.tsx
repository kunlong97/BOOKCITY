import React from 'react';
import cx from 'classnames';
import styles from './index.module.scss';
import { ErrorBlock, Grid, Space } from '@/bases';
import { px2rem } from '@/utils/unit';
import BookCover from '@/components/bookCover/bookCover';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/store';
import useRequest from '@/hooks/useRequest/useRequest';
import { IBookInfo } from '@/types/book';
import api from '../../api';
import Loading from '@/components/loading';

const SearchList: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const searchKeyword = useAppSelector<string>((state) => state.Search.searchKeyword); //从store中取出searchKeyword
  const searchMode = useAppSelector<boolean>((state) => state.Search.searchMode); //从store中取出searchMode

  // request 为 null 时 useRequest 会跳过请求（SWR 的 conditional fetching）——没有关键词
  // 就不该请求。之前这里无论有没有关键词都会立刻发一次 /bookList 请求，全靠外面用
  // searchMode 把结果藏起来，白白多打了一次接口。
  // 另外 useRequest 的缓存 key 现在会把 params 编进去（见 useRequest.ts 的改动），
  // 不同关键词对应不同的缓存条目，SWR 自己就会在 key 变化时重新请求，
  // 不再需要手动 useEffect + mutate() 去强制触发。
  const { data, error } = useRequest<IBookInfo[]>(
    searchKeyword ? { url: api.getSearchList, params: { q: searchKeyword } } : null
  );

  if (error && searchMode) {
    return <ErrorBlock />;
  }

  if (!data && searchMode) {
    return <Loading />;
  }

  return (
    <div className={cx(styles.searchList, { [styles.hidden]: !searchMode })}>
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
});

export default SearchList;
