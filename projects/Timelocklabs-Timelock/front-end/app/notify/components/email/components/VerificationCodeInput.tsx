import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface VerificationCodeInputProps {
	email: string;
	onSendCode: () => Promise<void>;
	onCodeChange: (code: string) => void;
	codeLength?: number;
	buttonText?: string;
	disabledText?: string;
	isFirstTime?: boolean;
}

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({ email, onSendCode, onCodeChange, codeLength = 6, buttonText, disabledText, isFirstTime = true }) => {
	const t = useTranslations('Notify.verificationCode');
	const [code, setCode] = useState<string[]>(Array(codeLength).fill(''));
	const inputRefs = useRef<HTMLInputElement[]>([]); 
	const [countdown, setCountdown] = useState(0); // New state for countdown
	const [isSendingCode, setIsSendingCode] = useState(false); // New state for button disable

	useEffect(() => {
		onCodeChange(code.join(''));
	}, [code, onCodeChange]);

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (countdown > 0) {
			timer = setTimeout(() => {
				setCountdown(prev => prev - 1);
			}, 1000);
		} else {
			setIsSendingCode(false); // Re-enable button when countdown finishes
		}
		return () => clearTimeout(timer);
	}, [countdown]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
		console.log('handleChange', e.target.value);
		const value = e.target.value;
		
		// Extract all digits
		const digits = value.replace(/[^\d]/g, '').split('');
		
		if (digits.length === 0) {
			// Handle deletion
			const newCode = [...code];
			newCode[index] = '';
			setCode(newCode);
			return;
		}
		
		// Create new verification code array
		const newCode = [...code];
		
		// Handle multiple digits input
		for (let i = 0; i < digits.length && index + i < codeLength; i++) {
			newCode[index + i] = digits[i] || '';
		}
		
		setCode(newCode);
		
		// Move focus to the next empty input field
		const nextEmptyIndex = newCode.findIndex((digit, idx) => !digit && idx > index);
		if (nextEmptyIndex !== -1 && nextEmptyIndex < codeLength) {
			inputRefs.current[nextEmptyIndex]?.focus();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
		if (e.key === 'Backspace' && !code[index] && index > 0 && inputRefs.current[index - 1]) {
			inputRefs.current[index - 1]?.focus();
		}
	};

	const handleResendCode = async () => {
		if (!email) {
			toast.error(t('pleaseEnterEmail'));
			return;
		}
		setIsSendingCode(true); // Disable button
		setCountdown(60); // Start countdown

		try {
			await onSendCode(); // Call the parent's onSendCode function
		} catch (error) {
			console.error('Error sending code:', error);
			setIsSendingCode(false); // Re-enable button if sending fails
			setCountdown(0); // Reset countdown if sending fails
		}
	};

	return (
		<div className='mb-6'>
			<label className='block text-sm font-medium   mb-2'>{t('label')}</label>
			<div className='flex items-center '>
				<div className='flex gap-2'>
					{Array.from({ length: codeLength }).map((_, i) => (
						<input
							key={i}
							type='text'
							maxLength={1}
							value={code[i] || ''}
							onChange={e => handleChange(e, i)}
							onKeyDown={e => handleKeyDown(e, i)}
							onPaste={e => {
								e.preventDefault();
								const pastedData = e.clipboardData.getData('text');
								handleChange({ target: { value: pastedData } } as React.ChangeEvent<HTMLInputElement>, i);
							}}
							ref={el => {
								inputRefs.current[i] = el as HTMLInputElement;
							}}
							aria-label={`${t('label')} digit ${i + 1} of ${codeLength}`}
							placeholder='0'
							className={`w-12 h-12 text-center border-2 border-gray-300 rounded-lg focus:border-black focus:ring-2 focus:ring-black text-xl font-mono transition-all duration-150
          ${code[i] ? 'border-black bg-gray-50' : ''}
              `}
							autoComplete='off'
						/>
					))}
				</div>

				<button
					type='button'
					onClick={handleResendCode}
					disabled={isSendingCode || countdown > 0}
					className={`ml-4 text-sm px-4 py-2 rounded-lg font-semibold transition-colors duration-150
            ${
							isSendingCode || countdown > 0 ?
								'bg-gray-100   cursor-not-allowed'
							:	'bg-gradient-to-r from-black via-gray-900 to-gray-700 text-white hover:from-gray-900 hover:to-black'
						}
          `}>
					{countdown > 0 ?
						<span>
							{disabledText || t('sent')} ({countdown}s)
						</span>
					:	buttonText || (isFirstTime ? t('sendCode') : t('resendCode'))}
				</button>
			</div>
		</div>
	);
};

export default VerificationCodeInput;
