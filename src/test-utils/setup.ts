import { Globals } from '@react-spring/web';
import { act, configure, waitFor } from '@testing-library/react';
import Toast from '@/bases/toast';
import { resetMockApi } from './mockApi';
import { installObservers, resetObservers } from './observers';

// 每个测试文件运行前执行一次（jest.config.js 的 setupFilesAfterEnv）

installObservers();

// 跳过 react-spring 动画，浮层的显示隐藏立即到终点
Globals.assign({ skipAnimation: true });

// 页面是 React.lazy 加载的，第一次渲染要现场编译，比普通组件慢
configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15000);

/**
 * Toast 挂在 Testing Library 管理的容器之外，用例结束时不会自动清理。
 * Toast 没有关闭方法，这里用一条立刻到期的 Toast 替换掉它，走正常的关闭流程。
 */
const closeToasts = async () => {
  if (!document.querySelector('.ygm-toast')) return;

  act(() => {
    Toast.show({ content: '', duration: 0 });
  });
  await waitFor(() => expect(document.querySelector('.ygm-toast')).toBeNull());
};

afterEach(async () => {
  await closeToasts();
  resetMockApi();
  resetObservers();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
