import React from 'react';
import { Popup, Grid } from '@/bases';
import styles from './index.module.scss';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setCatalogVisible, setFooterProgressBarVisible, setFooterSettingBarVisible, setNightTheme } from '@/pages/chapter/chapterSlice';

const NavBar: React.FC = React.memo(() => {
  const dispatch = useAppDispatch();
  const footerNavBarVisible = useAppSelector<boolean>((state) => state.Chapter.footerVisible);
  const nightTheme = useAppSelector<boolean>((state) => state.Chapter.nightTheme);

  const onCatalog = () => {
    dispatch(setCatalogVisible(true));
  };

  const onProgress = () => {
    dispatch(setFooterProgressBarVisible(true));
  };

  const onSetting = () => {
    dispatch(setFooterSettingBarVisible(true));
  };

  const onNightTheme = () => {
    dispatch(setNightTheme(!nightTheme));
    
  };

  return (
    <Popup position="bottom" visible={footerNavBarVisible} mask={false}>
      <div className={styles.navBar}>
        <Grid columns={4}>
          <div className={styles.item} onClick={onCatalog}>
            <div className={styles.icon}>
              <i className="icon-catalog" />
            </div>
            <div className={styles.name}>Contents</div>
          </div>

          <div className={styles.item} onClick={onProgress}>
            <div className={styles.icon}>
              <i className="icon-progress" />
            </div>
            <div className={styles.name}>Progress</div>
          </div>

          <div className={styles.item} onClick={onSetting}>
            <div className={styles.icon}>
              <i className="icon-setting" />
            </div>
            <div className={styles.name}>Settings</div>
          </div>

          <div className={styles.item} onClick={onNightTheme}>
            <div className={styles.icon}>
              {nightTheme ? <i className="icon-daytime" /> : <i className="icon-night" />}
            </div>
            <div className={styles.name}>{nightTheme ? 'Light Mode' : 'Night Mode'}</div>
          </div>
        </Grid>
      </div>
    </Popup>
  );
});

export default NavBar;
