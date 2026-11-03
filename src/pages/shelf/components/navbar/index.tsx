import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppSelector, useAppDispatch } from '@/store/store';

import styles from './index.module.scss';
import { clearSelectedBook, clearSelectedGroup, setEditMode, setGroupVisibleMode } from '../../shelfSlice';
import NavBar from '@/bases/nav-bar';

const Header: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const editMode = useAppSelector<boolean>((state) => state.Shelf.editMode);

  // 退出编辑模式时要同时清掉选中状态，否则下次进入编辑模式时上次的选择还在，
  // 用户可能没注意到，直接点删除就把这些书删了
  const exitEditMode = () => {
    dispatch(setEditMode(false));
    dispatch(setGroupVisibleMode(false));
    dispatch(clearSelectedBook());
    dispatch(clearSelectedGroup());
  };

  const onBack = () => {
    if (editMode) {
      exitEditMode();
    }
    navigate('/');
  };

  const onEdit = () => {
    if (editMode) {
      exitEditMode();
    } else {
      dispatch(setEditMode(true));
      dispatch(setGroupVisibleMode(false));
    }
  };

  return (
    <NavBar
      onBack={onBack}
      right={
        <div className={styles.right} onClick={onEdit}>
          {editMode ? 'Finish' : 'Edit'}
        </div>
      }
    >
      My Bookshelf
    </NavBar>
  );
});

export default Header;
