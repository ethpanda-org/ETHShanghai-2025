'use client';

// React imports
import React from 'react';

// External libraries
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

// Utils
import { cookieUtil } from '@/utils/cookieUtil';

// Type imports
import type { BaseComponentProps } from '@/types';

const LANGUAGES = [
	{ code: 'zh', label: '简体中文' },
	{ code: 'en', label: 'English' },
] as const;

interface LanguageSwitcherProps extends BaseComponentProps {
	variant?: 'default' | 'compact';
}

/**
 * Language switcher component for locale selection
 *
 * @param props - LanguageSwitcher component props
 * @returns JSX.Element
 */
export default function LanguageSwitcher({ className = '', variant = 'default' }: LanguageSwitcherProps) {
	const router = useRouter();
	const pathname = usePathname();
	const locale = useLocale();
	const t = useTranslations('common');

	// 获取当前路径，去掉 locale 部分
	const segments = pathname.split('/').filter(Boolean);
	const currentLocale = segments[0];

	const handleSwitch = (lang: string) => {
		if (lang === currentLocale) return;
		// 1. 存到 cookie，next-intl 会用它做默认语言
		cookieUtil.set('NEXT_LOCALE', lang, {
			path: '/',
			maxAge: 31536000, // 1 年有效期
		});
		router.refresh();
	};

	const baseClasses = variant === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';

	return (
		<div className={`flex items-center gap-2 ${className}`} aria-label={t('language_switcher')} role='group'>
			{LANGUAGES.map(({ code, label }) => (
				<button
					key={code}
					onClick={() => handleSwitch(code)}
					className={`${baseClasses} rounded transition border font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${
						locale === code ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-50'
					}`}
					aria-current={locale === code ? 'true' : undefined}
					aria-label={`Switch to ${label}`}
					type='button'>
					{label}
				</button>
			))}
		</div>
	);
}
