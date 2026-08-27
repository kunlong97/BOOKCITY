import { useParams } from 'react-router-dom';
import useBookDetail from '@/features/bookDetail/hooks/useBookDetail';
import BookDetailContext from '@/features/bookDetail/context';
import ChapterFooterCatalog from "./components/catalog";
import ChapterFooterNavBar from "./components/navBar";
import ChapterFooterProgressBar from "./components/progressBar";
import ChapterFooterSettingBar from "./components/settingBar";

/**
 * 之前 ChapterFooterCatalog 和 ChapterFooterProgressBar 各自独立请求同一本书的数据
 * （复用的是 detail 页面的 api.getBook），和 detail 重构前的问题一模一样——这次把请求
 * 收敛到 ChapterFooter 这一处。
 *
 * 但这里不能照搬 detail 页面"数据没到就不渲染子树"的 Provider 用法：阅读正文
 * （ChapterContent）跟这本书的 /book 数据完全无关，如果在这里也做"没数据就返回 Loading"
 * 的阻塞式 gate，会变成阅读页要等一个跟阅读内容无关的请求才能展示——这是明确要避免的
 * 倒退。所以这里的 Provider 不等待数据，直接把 useBookDetail 返回的 data（可能还是
 * undefined）传下去，Catalog/ProgressBar 自己处理"还没加载完"这个中间状态，
 * 和它们重构前的行为保持一致。
 */
const ChapterFooter:React.FC = () => {
  const { bookId } = useParams();
  const { data } = useBookDetail(bookId as string);

  return(
    <BookDetailContext.Provider value={data ?? null}>
      <ChapterFooterNavBar />
      <ChapterFooterCatalog />
      <ChapterFooterProgressBar />
      <ChapterFooterSettingBar />
    </BookDetailContext.Provider>
  )
}

export default ChapterFooter;