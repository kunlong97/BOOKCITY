import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Space, Grid, Tabs } from '@/bases';
import BookCover from '@/components/bookCover/bookCover';
import { IRanking } from '@/pages/home/types';
import { px2rem } from '@/utils/unit';
import styles from './index.module.scss';

interface IRankingProps {
  rankings: IRanking[];
}

const Ranking: React.FC<IRankingProps> = React.memo(({ rankings }) => {
  const navigate = useNavigate();

  const renderList = (rank: IRanking) => {
    return rank.books.map((book) => {
      return (
        <React.Fragment key={book.bookId}>
          <Grid.Item onClick={() => navigate(`/book/${book.bookId}`)}>
            <Space>
              <BookCover
                src={book.coverImg}
                alt={book.title}
                style={{ '--width': px2rem(47), '--height': px2rem(66) }}
              />
              <div className={styles.bookInfo}>
                <div className={styles.bookName}>{book.title}</div>
                <div className={styles.author}>{book.author}</div>
              </div>
            </Space>
          </Grid.Item>
        </React.Fragment>
      );
    });
  };

  const renderTab = () => {
    return rankings.map((rank, index) => {
      return (
        <Tabs.Tab title={rank.title} key={`${index + 1}`}>
          <Grid columns={2} gap={[0, px2rem(16)]}>
            {renderList(rank)}
          </Grid>
        </Tabs.Tab>
      );
    });
  };

  const onHeaderClick = () => {
    navigate('/ranking');
  };

  return (
    <div className={styles.ranking}>
      <Card
        title="Top Charts"
        extra="More"
        titleClassName={styles.title}
        headerClassName={styles.header}
        onHeaderClick={onHeaderClick}
      >
        <Tabs
          activeKey="1"
          showTabLine={false}
          type="card"
          tabActiveClassName={styles.tabActive}
          tabListClassName={styles.tabList}
          tabContentClassName={styles.tabContent}
        >
          {renderTab()}
        </Tabs>
      </Card>
    </div>
  );
});

export default Ranking;
