import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from '@/routers';
import store from '@/store/store';
import { Provider } from 'react-redux';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </Provider>
  );
};

export default App;
