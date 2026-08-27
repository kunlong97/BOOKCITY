import React from 'react';

type Value<T> = T | null;
const useReadLocalStorage = <T>(key: string): Value<T> => {
  //获取localStorage里的数据
  const readValue = React.useCallback((): Value<T> => {
    if (typeof window === 'undefined') {
      //兼容 SSR (服务端渲染) 环境，因为服务端没有 window 对象
      return null;
    }
    try {
      const item = window.localStorage.getItem(key); //获取localStorage里的数据。这里是用原生的api来获取，没有用之前封装的storage.get()，是为了解耦，因为这是个自定义hooks，要放在任何地方都能使用，需要独立
      return item ? (JSON.parse(item) as T) : null;
    } catch (err) {
      console.warn(`Error reading localStorage key ${key}:`, err);
      return null;
    }
  }, [key]);

  const [storedValue, setStoredValue] = React.useState<Value<T>>(readValue);

  //这个函数用来接收触发的自定义事件
  const handleStorageChange = React.useCallback(
    (event: Event) => {
      //CustomEvent是自定义事件.检查自定义事件 (CustomEvent) 传递的 detail.key 是否与当前监听的 key 匹配,不匹配直接返回.
      if ((event as CustomEvent).detail.key && (event as CustomEvent).detail.key !== key) {
        return;
      }
      setStoredValue(readValue());
    },
    [key, readValue],
  );

  React.useEffect(() => {
    window.addEventListener('local-storage', handleStorageChange); //addEventListener用于向window对象添加事件监听器，当指定事件触发时，执行相应的回调函数。监听名为local-storage的事件,执行handleStorageChange函数
    return () => {
      window.removeEventListener('local-storage', handleStorageChange);
    };
  }, [handleStorageChange]);

  return storedValue;
};

export default useReadLocalStorage;
