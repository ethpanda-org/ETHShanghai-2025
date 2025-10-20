import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Import Ant Design v5 compatibility patch for React 19
import '@ant-design/v5-patch-for-react-19';
import { MemoryRouter } from 'react-router-dom'
import './main.css'
import App from "./App.jsx";
// Import i18n configuration
import i18n from './i18n/config';

// Set HTML lang attribute before app rendering
// This allows the browser to correctly identify the page language and avoid showing incorrect translation prompts
console.log('Current language:', i18n.language);
document.documentElement.lang = i18n.language;

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  // </StrictMode>,
)
 
// Minimal PWA support - Only for supporting add to home screen feature, no caching
