import React from 'react';
import styles from './index.module.scss';
import { Link } from 'react-router-dom';
import Rank from '@/assets/images/rank.webp';
import Category from '@/assets/images/category.webp';
import Finish from '@/assets/images/finish.webp';
import Recommend from '@/assets/images/recommend.webp';

const Navbar: React.FC = React.memo(() => {
  return (
    <div className={styles.navbar}>
      <div className={styles.item}>
        <Link to="/ranking" className={styles.icon}>
          <img src={Rank} alt="rank" width="100%" />
          <h2 className={styles.title}>Rankings</h2>
        </Link>
      </div>

      <div className={styles.navbar}>
        <div className={styles.item}>
          <Link to="/category" className={styles.icon}>
            <img src={Category} alt="category" width="100%" />
            <h2 className={styles.title}>Genres</h2>
          </Link>
        </div>
      </div>

      <div className={styles.navbar}>
        <div className={styles.item}>
          <Link to="/book-list/finish" className={styles.icon}>
            <img src={Finish} alt="finish" width="100%" />
            <h2 className={styles.title}>Completed</h2>
          </Link>
        </div>
      </div>

      <div className={styles.navbar}>
        <div className={styles.item}>
          <Link to="/book-list/recommend" className={styles.icon}>
            <img src={Recommend} alt="recommend" width="100%" />
            <h2 className={styles.title}>Picks</h2>
          </Link>
        </div>
      </div>
    </div>
  );
});

export default Navbar;
