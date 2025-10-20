// 定义支持的区域设置列表
export const locales = ['en', 'zh', 'de'] as const;

// 从区域设置列表推断出 Locale 类型
export type Locale = (typeof locales)[number];

// 设置默认区域设置
export const defaultLocale: Locale = 'en';

// 国际化路由前缀配置 (next-intl)
// 'as-needed': 仅对非默认区域设置添加前缀
// 'always': 对所有区域设置添加前缀
// 'never': 不添加前缀 (不推荐用于多语言SEO)
export const localePrefix = 'never';

// 如果您需要为特定路径自定义不同语言的URL，可以在这里定义
// export const pathnames = {
//   '/': '/',
//   '/about': { en: '/about', zh: '/guanyu', de: '/ueber-uns' }
// };
