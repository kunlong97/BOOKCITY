// 必须放在第一行：先初始化 Sentry，再加载应用的其他模块
import './instrument';
import ReactDOM from 'react-dom/client';
import App from '@/App';

import '@/assets/styles/index.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
