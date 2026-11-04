import React from 'react';
import RankingHeader from './components/header';
import styles from './index.module.scss';
import RankingContent from './components/content';
import { ErrorBlock } from '@/bases';
import Loading from '@/components/loading';
import useRanking from './hooks/useRanking';

const Ranking: React.FC = () => {
  const { data, loading, error } = useRanking();

  if (error) {
    return <ErrorBlock />;
  }
  if (loading || !data) {
    return <Loading />;
  }

  return (
    <div className={styles.ranking}>
      <RankingHeader />
      {/* 没有任何榜单时直接提示，不渲染 RankingContent（它默认选中第一个榜单，列表为空会报错） */}
      {data.length > 0 ? (
        <RankingContent ranking={data} />
      ) : (
        <ErrorBlock title="No rankings available" description="Please check back later." />
      )}
    </div>
  );
};

export default Ranking;
