import { useAppDispatch, useAppSelector } from '@/store/store';
import React from 'react';
import { HISTORY_SEARCH_KEY } from '../../constants';
import cx from 'classnames';
import styles from './index.module.scss';
import useReadLocalStorage from '@/hooks/useReadLocalStorage';
import { Space } from '@/bases';
import { px2rem } from '@/utils/unit';
import { clearHistory, deleteHistory } from '../../utils';
import { setUrlParams } from '@/utils/url';
import { setSearchKeyword, setSearchMode } from '../../searchSlice';


const SearchHistory: React.FC = React.memo(() => {
  const dispatch = useAppDispatch();
  const searchMode = useAppSelector<boolean>((state) => state.Search.searchMode);
  const historyList = useReadLocalStorage<string[]>(HISTORY_SEARCH_KEY);

  //清空历史记录
  const onClear = () => {
    clearHistory();
  };

  //根据历史记录搜索
  const onSearch = (e: React.MouseEvent) => {
    const keyword = (e.target as HTMLElement).dataset['keyword'] as string;
    setUrlParams([['keyword', keyword]], 'search');
    dispatch(setSearchMode(true));
    dispatch(setSearchKeyword(keyword));
  };

  //删除对应的历史记录
  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = (e.target as HTMLElement).dataset['name'] as string; //从自定义的属性中取到要删除的记录
    deleteHistory(name);
  };

  return (
    <div className={cx(styles.searchHistory, { [styles.hidden]: searchMode })}>
      <div className={styles.header}>
        <div className={styles.title}>Search History</div>
        <i className="icon-delete" onClick={onClear} />
      </div>

      <div className={styles.list}>
        <Space direction="vertical" gap={px2rem(8)}>
          {Array.isArray(historyList) &&
            historyList.map((item) => {
              return (
                <div className={styles.listItem} key={item}>
                  <div className={styles.name} data-keyword={item} onClick={onSearch}>
                    {item}
                  </div>
                  <span className={styles.deleteBtn} data-name={item} onClick={onDelete}>
                    ×
                  </span>
                </div>
              );
            })}
        </Space>
      </div>
    </div>
  );
});

export default SearchHistory;
