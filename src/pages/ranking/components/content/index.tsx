import React, { useState } from 'react';
import styles from './index.module.scss';
import Sidebar from '@/bases/sidebar';
import { IRanking } from '../../types';
import { RANKING_LIST_KEY } from '../../constants';
import SidebarItem from '@/bases/sidebar/sidebar-item';
import BookList from '@/pages/ranking/components/booklist';

interface IRankingContentProps {
  ranking: IRanking;
}

// 排行榜目前只展示男生榜单，没有顶部 tab 可切换——activeKey 只需要在挂载时
// 取一次"这份固定榜单的第一项"当默认值，后续只会因为用户点击侧边栏项而变化，
// 不需要再监听任何外部状态来重置它。
const RankingContent: React.FC<IRankingContentProps> = React.memo(({ ranking }) => {
  const list = ranking[RANKING_LIST_KEY];
  const [activeKey, setActiveKey] = useState<string>(list[0].key);

  const onChange = (key: string) => {
    setActiveKey(key);
  };

  return (
    <div className={styles.rankingContent}>
      <Sidebar activeKey={activeKey} onChange={onChange}>
        {
          list.map((item) => {
            return <SidebarItem key={item.key} title={item.shortTitle}>
              <BookList id={item.key} gender={RANKING_LIST_KEY} />
            </SidebarItem>;
          })
        }
      </Sidebar>
    </div>
  );
});

export default RankingContent;
