import { useEffect, useRef } from 'react';
import { CountUp } from 'countup.js';

interface UseCountUpOptions {
	start?: number;
	end: number;
	duration?: number;
	decimals?: number;
	prefix?: string;
	suffix?: string;
	separator?: string;
	decimal?: string;
	useEasing?: boolean;
	useGrouping?: boolean;
}

export const useCountUp = (options: UseCountUpOptions) => {
	const elementRef = useRef<HTMLSpanElement>(null);
	const countUpRef = useRef<CountUp | null>(null);

	useEffect(() => {
		if (elementRef.current) {
			const { start = 0, end, duration = 2, decimals = 2, prefix = '', suffix = '', separator = ',', decimal = '.', useEasing = true, useGrouping = true } = options;

			countUpRef.current = new CountUp(elementRef.current, end, {
				startVal: start,
				duration,
				decimalPlaces: decimals,
				prefix,
				suffix,
				separator,
				decimal,
				useEasing,
				useGrouping,
			});

			if (!countUpRef.current.error) {
				countUpRef.current.start();
			}
		}
	}, [options.end, options.duration, options.decimals, options.prefix, options.suffix]);

	return elementRef;
};
