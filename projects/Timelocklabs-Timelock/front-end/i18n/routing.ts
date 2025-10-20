import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
	// A list of all locales that are supported
	locales: ['en', 'zh'],

	// Used when no locale matches
	defaultLocale: 'en',

	localePrefix: 'never', // 🚀 不在 URL 中加语言前缀

	localeCookie: true,
	localeDetection: false,
});
