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
      <RankingContent ranking={data} />
    </div>
  );
};

export default Ranking;
