import SearchBar, { SearchBarRef } from '@/bases/search-bar';
import { removeUrlParams, setUrlParams } from '@/utils/url';
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setHistory } from '../../utils';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setSearchKeyword, setSearchMode } from '../../searchSlice';
import useDebouncedCallback from '@/hooks/useDebouncedCallback';

const SEARCH_DEBOUNCE_MS = 300;

const BookSearchBar: React.FC = React.memo(() => {
  const searchKeyword = useAppSelector((state) => state.Search.searchKeyword);
  const searchRef = useRef<SearchBarRef>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // 打字触发的搜索：只负责"发起搜索"，不写入历史记录——历史记录该存用户明确
  // 要检索的完整关键词，不是打字过程中每一次停顿的中间状态（"h"、"he"、"hel"...）。
  const [debouncedSearch, cancelDebouncedSearch] = useDebouncedCallback((value: string) => {
    setUrlParams([['keyword', value]], 'search');
    dispatch(setSearchKeyword(value));
  }, SEARCH_DEBOUNCE_MS);

  //输入框回车键触发事件：立即搜索，不等防抖，同时把历史记录这件事只留给这条"明确提交"的路径
  const onSearch = (value: string) => {
    if (!value) return;
    cancelDebouncedSearch(); // 防止等会儿那次还没触发的防抖搜索用同一个值重复 dispatch 一次
    setUrlParams([['keyword', value]], 'search'); //设置或更新 URL 中的查询参数
    setHistory(value);
    dispatch(setSearchKeyword(value));
  };

  //点击取消按钮时触发事件
  const onCancel = () => {
    navigate(-1); //返回上一页
  };

  //点击清除图标时触发事件
  const onClear = () => {
    cancelDebouncedSearch();
    removeUrlParams(['keyword'], '/search');
    dispatch(setSearchKeyword(''));
    dispatch(setSearchMode(false));
  };

  const onChange = (value: string) => {
    if (!value) {
      // 清空要立即生效，且要取消掉可能还在等待触发的防抖搜索——否则用户已经清空了
      // 输入框，300ms 后那个搜索请求却"复活"了，界面会莫名其妙又跳回搜索结果页。
      cancelDebouncedSearch();
      removeUrlParams(['keyword'], '/search');
      dispatch(setSearchKeyword(''));
      dispatch(setSearchMode(false));
      return;
    }
    // 搜索模式（隐藏热搜/历史，显示结果区）立即切换，让用户输入的即时反馈不被防抖拖慢；
    // 真正发请求这件事——也就是防抖要控制的那部分——交给 debouncedSearch。
    dispatch(setSearchMode(true));
    debouncedSearch(value);
  };

  useEffect(() => {
    searchRef.current?.focus(); //自动获取焦点
  }, []);

  useEffect(() => {
    if (searchKeyword) {
      dispatch(setSearchMode(true));
      searchRef.current?.setValue(searchKeyword as string);
    }
  }, [searchKeyword]);

  return (
    <SearchBar
      value={searchKeyword as string}
      placeholder="Search books or authors"
      onSearch={onSearch}
      showCancel={true}
      onCancel={onCancel}
      onClear={onClear}
      onChange={onChange}
    />
  );
});

export default BookSearchBar;
