import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入翻译资源
import enTranslations from './translations/en.json';
import zhTranslations from './translations/zh.json';

// 从Utils.js导入已有的浏览器语言检测函数
import { detectBrowserLanguage } from '../utils/browserUtils.js';

export const ALL_LANGUAGES = [{value: 'en', label: 'English'}, {value: 'zh', label: '中文'}];

// 添加i18n语言变化事件监听器
// 当语言切换时，自动更新HTML的lang属性
i18n.on('languageChanged', (lng) => {
  if (document && document.documentElement) {
    document.documentElement.lang = lng;
  }
});

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      zh: {
        translation: zhTranslations
      }
    },
    lng: detectBrowserLanguage(), // 根据浏览器自动检测语言
    fallbackLng: 'en', // 回退语言
    interpolation: {
      escapeValue: false // react已经处理了xss，所以不需要额外转义
    }
  });

export default i18n;
