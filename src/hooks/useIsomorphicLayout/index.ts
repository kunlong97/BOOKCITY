import React from 'react';

//由于 useLayoutEffect 在服务端渲染（SSR）时会触发 React 警告（因为服务端没有 DOM），所以实际项目中通常会封装一个兼容版本：
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export default useIsomorphicLayoutEffect;