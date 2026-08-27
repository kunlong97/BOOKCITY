import styles from './index.module.scss';
import cx from 'classnames';
import { useNavigate, useParams } from 'react-router-dom';
import { useBookDetailContext } from '@/features/bookDetail/context';
import useShelf from '@/features/shelf/hooks/useShelf';
import { Button, Toast } from '@/bases';

const DetailFooter: React.FC = () => {
  const id = useParams().id as string;
  const book = useBookDetailContext();
  const { isInShelf, toggle } = useShelf();

  // shelfMode 不再是本地维护的一份镜像状态，而是直接从 useShelf 的数据派生：
  // useShelf 内部靠 useReadLocalStorage 订阅了 'local-storage' 事件，toggle 之后
  // 事件一发，这里会自动重新求值。重构前是本地 useState + 手动 setShelfMode(!shelfMode)
  // 翻转，这份本地状态和 localStorage 里的真实数据是两份独立的东西，
  // 一旦 toggle 内部的判断结果和"简单取反"不一致（比如这次顺带修的分组场景），
  // 本地状态就会跟真实数据对不上。
  const shelfMode = isInShelf(book.bookId);
  const navigate = useNavigate();

  const onShelf = () => {
    const msg = toggle(book);
    Toast.show(msg);   //加入书架后弹窗提示Toast组件
  };

  const onRead = () => {
    navigate(`/book/${id}/1`);
  }

  return (
    <div className={styles.footer}>

      <Button block color="primary" onClick={onRead}>Start Reading</Button>

      <div className={cx(styles.icon, { [styles.active]: shelfMode })} onClick={onShelf}>
        <i className="icon-book" />
        <p>Add to bookshelf</p>
      </div>
    </div>
  );
};

export default DetailFooter;
