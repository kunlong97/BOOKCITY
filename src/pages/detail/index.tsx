import React from 'react'
import { useParams } from 'react-router-dom'
import Loading from '@/components/loading';
import { ErrorBlock } from '@/bases';
import DetailHeader from './components/detailHeader';
import DetailContent from './components/detailContent';
import DetailFooter from './components/detailFooter';
import useBookDetail from '@/features/bookDetail/hooks/useBookDetail';
import BookDetailContext from '@/features/bookDetail/context';

const Detail:React.FC = () => {

  const id = useParams().id as string;
  const { data, loading, error, notFound } = useBookDetail(id);

  // error 要先判断：重构前是先判断 !data 再判断 error，但请求失败时 data 永远不会
  // 变成真值，导致 error 分支其实永远走不到，页面会一直卡在 Loading。
  // 书不存在（notFound）同理，也要在 Loading 之前判断。
  if (error || notFound) {
    return <ErrorBlock />
  }
  if (loading || !data) {
    return <Loading />
  }

  return(
    <BookDetailContext.Provider value={data}>
      <DetailHeader/>
      <DetailContent />
      <DetailFooter />
    </BookDetailContext.Provider>
  )
}

export default Detail;