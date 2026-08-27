import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppSelector, useAppDispatch } from '@/store/store';

import styles from './index.module.scss';
import { setEditMode, setGroupVisibleMode } from '../../shelfSlice';
import NavBar from '@/bases/nav-bar';

const Header: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const editMode = useAppSelector<boolean>((state) => state.Shelf.editMode);

  const onBack = () => {
    if(editMode){
      dispatch(setEditMode(!editMode));
      dispatch(setGroupVisibleMode(false));     
    }
    navigate('/');
  };

  const onEdit = () => {
    dispatch(setEditMode(!editMode));
    dispatch(setGroupVisibleMode(false));
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
