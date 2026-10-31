import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import ErrorBoundary from '..';

const Bomb = (): JSX.Element => {
  throw new Error('render crashed');
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Link to="/ok">go ok</Link>
      <Link to="/crash">go crash</Link>
      <ErrorBoundary>
        <Routes>
          <Route path="/ok" element={<div>正常页面</div>} />
          <Route path="/crash" element={<Bomb />} />
        </Routes>
      </ErrorBoundary>
    </MemoryRouter>,
  );

describe('ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    // React 和 componentDidCatch 都会把渲染异常打印到 console.error，这里屏蔽，避免干扰测试输出
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('子组件正常时，直接渲染子组件', () => {
    renderAt('/ok');

    expect(screen.getByText('正常页面')).toBeTruthy();
    expect(screen.queryByText('Back to Homepage')).toBeNull();
  });

  it('子组件渲染出错时，显示错误页和Back to Homepage按钮，而不是让整个应用崩溃', () => {
    renderAt('/crash');

    expect(screen.getByText('Something went wrong with this page. Please try again later.')).toBeTruthy();
    expect(screen.getByText('Back to Homepage')).toBeTruthy();
    // 边界外面的内容不受影响
    expect(screen.getByText('go ok')).toBeTruthy();
  });

  it('捕获到异常时输出错误日志，带上错误对象和组件栈', () => {
    renderAt('/crash');

    expect(consoleError).toHaveBeenCalledWith(
      'Uncaught render error:',
      expect.objectContaining({ message: 'render crashed' }),
      expect.stringContaining('Bomb'),
    );
  });

  describe('路由切换时重置', () => {
    it('页面崩溃后切到其他路由，显示恢复正常', () => {
      renderAt('/crash');
      expect(screen.getByText('Something went wrong with this page. Please try again later.')).toBeTruthy();

      fireEvent.click(screen.getByText('go ok'));

      expect(screen.getByText('正常页面')).toBeTruthy();
      expect(screen.queryByText('Something went wrong with this page. Please try again later.')).toBeNull();
    });

    it('从正常页面切到会崩溃的页面时，同样能捕获', () => {
      renderAt('/ok');

      fireEvent.click(screen.getByText('go crash'));

      expect(screen.getByText('Something went wrong with this page. Please try again later.')).toBeTruthy();
    });
  });

  describe('点击Back to Homepage', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // jsdom 的 location.href 赋值会触发未实现的页面跳转，这里换成普通对象来观察赋值结果
      Object.defineProperty(window, 'location', { configurable: true, value: { href: '/crash' } });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it('整页跳转回首页', () => {
      renderAt('/crash');

      fireEvent.click(screen.getByText('Back to Homepage'));

      expect(window.location.href).toBe('/');
    });
  });
});
