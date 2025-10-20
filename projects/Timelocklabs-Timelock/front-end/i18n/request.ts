import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// 静态导入语言文件以减少动态导入开销
import enMessages from './local/en.js';
import zhMessages from './local/zh.js';

// 创建消息缓存
const messagesCache = {
	en: enMessages,
	zh: zhMessages,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
	const requested = await requestLocale;
	const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

	return {
		locale,
		// 使用缓存的消息而不是动态导入
		messages: messagesCache[locale as keyof typeof messagesCache],
	};
});
