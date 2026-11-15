import { LeftOutline } from 'antd-mobile-icons';
import './styles/index.scss';

export interface NavBarProps {
  /** 点击返回区域后的回调 */
  onBack?: () => void;

  /** 右侧内容 */
  right?: React.ReactNode;

  /** 是否显示返回区域的箭头 */
  leftArrow?: boolean;

  /** 中间内容 */
  children?: React.ReactNode;

  /** 返回区域文字 */
  leftText?: string;

  /** 样式 */
  style?: React.CSSProperties & Partial<Record<'--nav-bar-height' | '--border-bottom', string>>;
}

const NavBar: React.FC<NavBarProps> = ({ onBack, right, leftArrow = true, children, leftText = '', style }) => {
  const classPrefix = 'ygm-nav-bar';

  return (
    <div className={classPrefix} style={style}>
      <div className={`${classPrefix}-left`} onClick={onBack}>
        {leftArrow && (
          <div className={`${classPrefix}-left-icon`}>
            <LeftOutline />
          </div>
        )}
        <div className={`${classPrefix}-left-text`}>{leftText}</div>
      </div>
      {/* 有标题时用 h1：每个页面都需要一个一级标题，读屏软件靠它告诉用户当前在哪个页面。
          reset.scss 已经把 h1 的字号、字重、边距重置成和普通文字一样，外观不变 */}
      {children ? <h1 className={`${classPrefix}-title`}>{children}</h1> : <div className={`${classPrefix}-title`} />}
      <div className={`${classPrefix}-right`}>{right}</div>
    </div>
  );
};

NavBar.displayName = 'NavBar';

export default NavBar;
