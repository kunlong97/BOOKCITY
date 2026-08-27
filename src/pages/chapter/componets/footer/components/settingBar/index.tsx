import { Grid, Popup } from '@/bases';
import { useAppSelector } from '@/store/store';
import React from 'react';
import styles from './index.module.scss';
import Slider from '@/bases/slider';
import { useDispatch } from 'react-redux';
import { setFontSize, setNightTheme, setTheme } from '@/pages/chapter/chapterSlice';
import { px2rem } from '@/utils/unit';
import { THEME } from '../../../constants';
import cx from 'classnames';

const ChapterFooterSettingBar: React.FC = React.memo(() => {
  const dispatch = useDispatch();
  const footerSettingBarVisible = useAppSelector<boolean>((state) => state.Chapter.footerSettingBarVisible);
  const theme = useAppSelector<string>((state) => state.Chapter.theme);

  //滑动时切换字号大小
  const onChange = (value: number) => {
    dispatch(setFontSize(value));
  };

  //滑动结束后切换字号大小
  const onChangeAfter = (value: number) => {
    dispatch(setFontSize(value));
  };

  //切换主题
  const onSetTheme = (theme: string) => {
    dispatch(setTheme(theme));
    dispatch(setNightTheme(false));
  };

  return (
    <Popup position="bottom" visible={footerSettingBarVisible} mask={false}>
      <div className={styles.settingBar}>
        <div className={styles.setFont}>
          <div className={styles.text}>A-</div>
          <div className={styles.slider}>
            <Slider onChange={onChange} onChangeAfter={onChangeAfter} min={14} max={28} />
          </div>
          <div className={styles.text}>A+</div>
        </div>
        <div className={styles.setTheme}>
          <Grid columns={4} gap={px2rem(20)}>
            {THEME.map((item) => {
              return (
                <Grid.Item key={item}>
                  <div
                    style={{ background: item }}
                    className={cx(styles.selector, { [styles.active]: item === theme })}
                    onClick={() => onSetTheme(item)}
                  />
                </Grid.Item>
              );
            })}
          </Grid>
        </div>
      </div>
    </Popup>
  );
});

export default ChapterFooterSettingBar;
