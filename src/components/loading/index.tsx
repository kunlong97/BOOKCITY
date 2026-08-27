import React from 'react';
import { SpinnerLoading } from '@/bases';
import styles from './index.module.scss';

const Loading: React.FC = React.memo(() => {
  return (
    <div className={styles.loading}>
      <SpinnerLoading />
    </div>
  );
});
export default Loading;
