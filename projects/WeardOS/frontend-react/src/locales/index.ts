import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './zh-CN';
import enUS from './en-US';

const resources = {
  'zh-CN': {
    translation: zhCN
  },
  'en-US': {
    translation: enUS
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-CN', // 默认语言
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;