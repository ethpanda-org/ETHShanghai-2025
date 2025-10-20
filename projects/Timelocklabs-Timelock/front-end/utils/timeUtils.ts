/**
 * 将秒数转换为人类可读的时间格式
 * @param seconds - 秒数
 * @returns 格式化的时间字符串，如 "2 days 3 hours"
 */
export function formatSecondsToHumanTime(seconds: number): string {
	if (seconds === 0) return '0 seconds';

	const units = [
		{ name: 'year', seconds: 365 * 24 * 60 * 60 },
		{ name: 'month', seconds: 30 * 24 * 60 * 60 },
		{ name: 'day', seconds: 24 * 60 * 60 },
		{ name: 'hour', seconds: 60 * 60 },
		{ name: 'minute', seconds: 60 },
		{ name: 'second', seconds: 1 },
	];

	const parts: string[] = [];
	let remainingSeconds = seconds;

	for (const unit of units) {
		const count = Math.floor(remainingSeconds / unit.seconds);
		if (count > 0) {
			parts.push(`${count} ${unit.name}${count > 1 ? 's' : ''}`);
			remainingSeconds -= count * unit.seconds;

			// 只显示最大的两个单位，避免过长
			if (parts.length >= 2) break;
		}
	}

	return parts.join(' ') || '0 seconds';
}

/**
 * 将秒数转换为国际化的时间格式
 * @param seconds - 秒数
 * @param locale - 语言环境 ('en' | 'zh')
 * @returns 格式化的时间字符串
 */
export function formatSecondsToLocalizedTime(seconds: number, locale: 'en' | 'zh' = 'en'): string {
	if (seconds === 0) {
		return locale === 'zh' ? '0秒' : '0 seconds';
	}

	const units =
		locale === 'zh' ?
			[
				{ name: '年', seconds: 365 * 24 * 60 * 60 },
				{ name: '月', seconds: 30 * 24 * 60 * 60 },
				{ name: '天', seconds: 24 * 60 * 60 },
				{ name: '小时', seconds: 60 * 60 },
				{ name: '分钟', seconds: 60 },
				{ name: '秒', seconds: 1 },
			]
		:	[
				{ name: 'year', seconds: 365 * 24 * 60 * 60 },
				{ name: 'month', seconds: 30 * 24 * 60 * 60 },
				{ name: 'day', seconds: 24 * 60 * 60 },
				{ name: 'hour', seconds: 60 * 60 },
				{ name: 'minute', seconds: 60 },
				{ name: 'second', seconds: 1 },
			];

	const parts: string[] = [];
	let remainingSeconds = seconds;

	for (const unit of units) {
		const count = Math.floor(remainingSeconds / unit.seconds);
		if (count > 0) {
			if (locale === 'zh') {
				parts.push(`${count}${unit.name}`);
			} else {
				parts.push(`${count} ${unit.name}${count > 1 ? 's' : ''}`);
			}
			remainingSeconds -= count * unit.seconds;

			// 只显示最大的两个单位
			if (parts.length >= 2) break;
		}
	}

	return parts.join(locale === 'zh' ? '' : ' ') || (locale === 'zh' ? '0秒' : '0 seconds');
}
