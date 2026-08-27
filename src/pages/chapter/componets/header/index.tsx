import React from 'react';
import styles from './index.module.scss';
import { Popup } from '@/bases';
import NavBar from '@/bases/nav-bar';
import { useAppSelector } from '@/store/store';
import { useNavigate } from 'react-router-dom';

const ChapterHeader: React.FC = React.memo(() => {
  const navigate = useNavigate();

  const headerVisible = useAppSelector<boolean>((state) => state.Chapter.headerVisible); //控制导航的显示与隐藏

  //返回到首页
  const onGoHome = () => {
    navigate('/');
  };

  //返回到上一页
  const onBack = () => {
    navigate(-1);
  };

  const rightRender = () => {
    return (
      <div className={styles.icons}>
        <i className="icon-home" onClick={onGoHome} />
      </div>
    );
  };

  return (
    <div className={styles.header}>
      <Popup position="top" mask={false} visible={headerVisible}>
        <NavBar right={rightRender()} onBack={onBack} />
      </Popup>
    </div>
  );
});

export default ChapterHeader;
