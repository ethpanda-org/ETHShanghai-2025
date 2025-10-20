import React, { useMemo } from 'react';
import { useCountUp } from '@/hooks/useCountUp';

interface AnimatedAmountValueProps {
	value: number;
	className?: string;
	maxDigits?: number; // Maximum digits before switching to scientific notation
}

const AnimatedAmountValue: React.FC<AnimatedAmountValueProps> = ({
	value,
	className = '',
	maxDigits = 8, // Default: switch to scientific notation if more than 8 digits
}) => {
	const numValue = value || 0;

	// Memoize calculations to avoid unnecessary re-renders
	const { shouldUseScientific, coefficientNum, exponent, decimals } = useMemo(() => {
		const shouldUse = Math.abs(numValue) >= Math.pow(10, maxDigits) || (Math.abs(numValue) < 0.0001 && Math.abs(numValue) > 0);

		const scientificStr = numValue.toExponential(2);
		const parts = scientificStr.split('e');
		const coeff = parseFloat(parts[0] || '0');
		const exp = parts[1] || '0';
		const dec = numValue < 1 ? 6 : 4;

		return {
			shouldUseScientific: shouldUse,
			coefficientNum: coeff,
			exponent: exp,
			decimals: dec,
		};
	}, [numValue, maxDigits]);

	// Memoize hook options to prevent unnecessary re-renders
	const scientificOptions = useMemo(
		() => ({
			end: coefficientNum,
			duration: 1.5,
			decimals: 2,
			separator: '',
		}),
		[coefficientNum]
	);

	const normalOptions = useMemo(
		() => ({
			end: numValue,
			duration: 1.5,
			decimals,
			separator: ',',
		}),
		[numValue, decimals]
	);

	// Always call both hooks at the top level
	const scientificCountUpRef = useCountUp(scientificOptions);
	const normalCountUpRef = useCountUp(normalOptions);

	// Choose which rendering to use based on the condition
	if (shouldUseScientific) {
		return (
			<span className={className}>
				<span ref={scientificCountUpRef}>0.00</span>e{exponent}
			</span>
		);
	} else {
		return (
			<span ref={normalCountUpRef} className={className}>
				{numValue < 1 ? '0.000000' : '0.0000'}
			</span>
		);
	}
};

export default AnimatedAmountValue;
