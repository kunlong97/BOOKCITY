import styles from './index.module.scss';
import BookSearchBar from './components/searchBar';
import SearchList from './components/searchList';
import SearchHot from './components/searchHot';
import SearchHistory from './components/searchHistory';
import { setSearchKeyword } from './searchSlice';
import { useAppDispatch } from '@/store/store';
import { parse } from 'query-string';
import { useEffect } from 'react';

export default function Search() {
  const dispatch = useAppDispatch();

  // 支持 /search?keyword=xxx 深链接：把 URL 上的关键词种进 store，
  // BookSearchBar 里已有的 effect 会在 searchKeyword 变化时自动把搜索模式打开、
  // 把关键词填进输入框，这里不需要重复处理。
  useEffect(() => {
    const keyword = parse(window.location.search).keyword;
    if (typeof keyword === 'string' && keyword) {
      dispatch(setSearchKeyword(keyword));
    }
  }, [dispatch]);

  return (
    <div className={styles.search}>
      <BookSearchBar />
      <SearchHot />
      <SearchHistory />
      <SearchList />
    </div>
  );
}
