import React from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './index.module.scss';
import Sidebar from '@/bases/sidebar';
import { IRanking } from '../../types';
import SidebarItem from '@/bases/sidebar/sidebar-item';
import BookList from '@/pages/ranking/components/booklist';

interface IRankingContentProps {
  ranking: IRanking;
}

// 选中的榜单存在 URL 的 ?key= 里：从详情页返回、刷新页面或分享链接时都能保留。
// URL 里没有 key 或 key 不存在时，默认选中第一个榜单。
const RankingContent: React.FC<IRankingContentProps> = React.memo(({ ranking }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyInUrl = searchParams.get('key');
  const activeKey = ranking.some((item) => item.key === keyInUrl) ? (keyInUrl as string) : ranking[0].key;

  const onChange = (key: string) => {
    // 用 replace：切换榜单不应该在浏览器历史里留下一条条记录
    setSearchParams({ key }, { replace: true });
  };

  return (
    <div className={styles.rankingContent}>
      <Sidebar activeKey={activeKey} onChange={onChange}>
        {
          ranking.map((item) => {
            return <SidebarItem key={item.key} title={item.shortTitle}>
              <BookList id={item.key} />
            </SidebarItem>;
          })
        }
      </Sidebar>
    </div>
  );
});

export default RankingContent;
