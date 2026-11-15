import styles from './index.module.scss';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <h1>MoocReads</h1>
      </div>
      <div className={styles.right}>
        {/* 链接里只有图标字体，没有文字：用 aria-label 告诉读屏软件这是什么，图标本身对读屏隐藏 */}
        <Link to="/search" aria-label="Search">
          <i className="icon-search" aria-hidden="true" />
        </Link>
        <Link to="/shelf" aria-label="My Bookshelf">
          <i className="icon-shelf" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
