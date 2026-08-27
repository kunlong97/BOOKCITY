import React from 'react';
import cx from 'classnames';
import styles from './index.module.scss';
import { Space } from '@/bases';
import { px2rem } from '@/utils/unit';
import { useAppDispatch, useAppSelector } from '@/store/store';
import useRequest from '@/hooks/useRequest/useRequest';
import api from '../../api';
import { setHistory } from '../../utils';
import { setUrlParams } from '@/utils/url';
import { setSearchKeyword, setSearchMode } from '../../searchSlice';


const SearchHot: React.FC = React.memo(() => {
  const searchMode = useAppSelector((state) => state.Search.searchMode);
  const { data, error } = useRequest<string[]>({ url: api.getHotSearch });
  const dispatch = useAppDispatch();

  const onSearch = (e: React.MouseEvent<HTMLDivElement>) => {
    const keyword = e.currentTarget.dataset.keyword; //获取自定义属性data-keyword的值

    setHistory(keyword as string); //保存到localStorage
    setUrlParams([['keyword', keyword as string]], 'search');
    dispatch(setSearchMode(true));
    dispatch(setSearchKeyword(keyword as string));
  };

  if (!data || error) {
    return null;
  }

  return (
    <div className={cx(styles.searchHot, { [styles.hidden]: searchMode })}>
      <div className={styles.title}>Trending Searches</div>
      <div className={styles.searchTags}>
        <Space wrap gap={[px2rem(20), px2rem(10)]}>
          {(data || []).map((item, index) => {
            return (
              <div key={index} className={styles.tag} onClick={onSearch} data-keyword={item}>
                {item}
              </div>
            );
          })}
        </Space>
      </div>
    </div>
  );
});

export default SearchHot;
