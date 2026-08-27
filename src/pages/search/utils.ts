import storage from '@/utils/storage';
import { HISTORY_SEARCH_KEY } from './constants';

const deleteArrItem = (arr: string[], value: string) => {
  const index = arr.findIndex((item) => item === value);
  if (index !== -1) {
    arr.splice(index, 1);
  }
};

//保存数据到历史记录中
export const setHistory = (value: string) => {
  if (!value) return;
  let arr: string[] = storage.get(HISTORY_SEARCH_KEY) || [];
  deleteArrItem(arr, value);
  arr.unshift(value);
  storage.set(HISTORY_SEARCH_KEY, arr);

  //触发一个名为local-storage的自定义事件
  window.dispatchEvent(new CustomEvent('local-storage', { detail: { key: HISTORY_SEARCH_KEY } }));
};

//删除历史记录中的数据
export const deleteHistory = (value: string) => {
  let arr: string[] = storage.get(HISTORY_SEARCH_KEY) || [];
  deleteArrItem(arr, value);
  storage.set(HISTORY_SEARCH_KEY, arr);

  //触发一个名为local-storage的自定义事件
  window.dispatchEvent(new CustomEvent('local-storage', { detail: { key: HISTORY_SEARCH_KEY } }));
};

//清空历史记录中的数据
export const clearHistory = () => {
  storage.remove(HISTORY_SEARCH_KEY);

  //触发一个名为local-storage的自定义事件
  window.dispatchEvent(new CustomEvent('local-storage', { detail: { key: HISTORY_SEARCH_KEY } }));
};
