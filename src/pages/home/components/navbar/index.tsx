import React from 'react';
import styles from './index.module.scss';
import { Link } from 'react-router-dom';
import Rank from '@/assets/images/rank.png';
import Category from '@/assets/images/category.png';
import Finish from '@/assets/images/finish.png';
import Recommend from '@/assets/images/recommend.png';

const Navbar: React.FC = React.memo(() => {
  return (
    <div className={styles.navbar}>
      <div className={styles.item}>
        <Link to="/ranking" className={styles.icon}>
          <img src={Rank} alt="rank" width='100%' />
          <h3 className={styles.title}>Rankings</h3>
        </Link>
      </div>

      <div className={styles.navbar}>
        <div className={styles.item}>
          <Link to="/category" className={styles.icon}>
            <img src={Category} alt="category" width='100%' />
            <h3 className={styles.title}>Genres</h3>
          </Link>
        </div>
      </div>

      <div className={styles.navbar}>
        <div className={styles.item}>
          <Link to="/book-list/finish" className={styles.icon}>
            <img src={Finish} alt="finish" width='100%' />
            <h3 className={styles.title}>Completed</h3>
          </Link>
        </div>
      </div>

      <div className={styles.navbar}>
        <div className={styles.item}>
          <Link to="/book-list/recommend" className={styles.icon}>
            <img src={Recommend} alt="recommend" width='100%' />
            <h3 className={styles.title}>Picks</h3>
          </Link>
        </div>
      </div>
    </div>
  );
});

export default Navbar;
