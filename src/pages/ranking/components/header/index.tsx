import React from 'react';
import NavBar from '@/bases/nav-bar';
import { useNavigate } from 'react-router-dom';

const RankingHeader: React.FC = React.memo(() => {
  const naviagte = useNavigate();

  //返回到上一页
  const onBack = () => {
    naviagte(-1);
  };

  return (
    <NavBar onBack={onBack} leftText="Back">
      Rankings
    </NavBar>
  );
});

export default RankingHeader;
