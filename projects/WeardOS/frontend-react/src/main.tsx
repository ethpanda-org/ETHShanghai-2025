import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './locales/index'; // 初始化国际化
import './index.css'; // Tailwind CSS
import './App.scss';
import { initStrictModeCompatibility } from './utils/reactStrictModeHelper';

// 声明全局的ethereum对象
declare global {
  interface Window {
    ethereum?: any;
  }
}

// 初始化StrictMode兼容性助手
const cleanupStrictModeCompatibility = initStrictModeCompatibility();

// 在应用卸载时清理
window.addEventListener('beforeunload', cleanupStrictModeCompatibility);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);