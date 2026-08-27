import styles from './index.module.scss';
import useRequest from '@/hooks/useRequest/useRequest';
import { IChapterInfo } from '@/types/book';
import api from '../../api';
import { useBookDetailContext } from '@/features/bookDetail/context';

const DetailContent: React.FC = () => {
  const book = useBookDetailContext();
  // 注：api.getChapterInfo 目前是个固定字符串，不带 bookId 参数——mock 后端里
  // /chapterInfo 就是一份写死的数据，不区分书籍。这是 mock 数据本身的局限，
  // 不属于这次分层重构要解决的问题，这里保留原样，只是顺手记录下来。
  const { data: chapterInfo } = useRequest<IChapterInfo>({ url: api.getChapterInfo });

  if (!chapterInfo) return null;

  return (
    <div className={styles.detailContent}>
      <h1>{book.chapters?.[0]}</h1>
      {chapterInfo.content.map((item) => {
        return <p key={item}>{item}</p>;
      })}
    </div>
  );
};

export default DetailContent;
