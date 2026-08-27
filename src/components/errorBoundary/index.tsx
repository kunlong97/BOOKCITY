import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button, ErrorBlock } from '@/bases';
import styles from './index.module.scss';

interface IErrorBoundaryProps {
  children: React.ReactNode;
}

interface IErrorBoundaryState {
  error: Error | null;
}

/**
 * 这个项目里已经不止一次真实发生过：某个组件渲染时抛出未捕获的异常
 * （detail 页面 DetailFooter 的非空断言、search/ranking 挂在断联 store 上
 * 读 undefined 字段），重构前因为整个应用没有一个 Error Boundary，React 只能
 * 把离出错点最近、一路到根节点的整棵组件树全部卸载——不是那一个页面白屏，
 * 是连 BrowserRouter 外层都不剩，客户端路由跟着失效，只能强制刷新整个页面。
 *
 * Error Boundary 必须是 class 组件——React 目前没有 hooks 版本的
 * getDerivedStateFromError/componentDidCatch。
 */
class ErrorBoundaryImpl extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
  state: IErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): IErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  private onBackHome = () => {
    // 用整页跳转而不是 useNavigate：这里已经是"某处渲染崩溃"之后的兜底路径，
    // 不应该依赖任何可能受牵连的 React 状态（包括 Router 的 context）能正常工作，
    // window.location 是唯一在任何情况下都能用的逃生手段。
    window.location.href = '/';
  };

  render() {
    if (this.state.error) {
      return (
        <div className={styles.errorBoundary}>
          <ErrorBlock />
          <Button color="primary" onClick={this.onBackHome}>
            返回首页
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * 用当前路由的 pathname 当 key：路由一变就强制重新挂载 ErrorBoundaryImpl，
 * 清空它记录的 error 状态。Boundary 挂在 BrowserRouter 内部、Router 外部，
 * Router 本身不会被卷进崩溃里——配合按路由重置，哪怕某个页面渲染崩了，
 * 用户点导航栏切到别的页面依然是正常的客户端路由跳转，不需要整页刷新。
 */
const ErrorBoundary: React.FC<IErrorBoundaryProps> = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundaryImpl key={location.pathname}>{children}</ErrorBoundaryImpl>;
};

export default ErrorBoundary;
