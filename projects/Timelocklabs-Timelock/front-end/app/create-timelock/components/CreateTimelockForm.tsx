import React, { useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import SectionHeader from '@/components/ui/SectionHeader';
import ChainSelector from '@/components/web3/ChainSelector';
import TextInput from '@/components/ui/TextInput';
import { Button } from '@/components/ui/button';
import ContractStandardSelection from './ContractStandardSelection';
import { formatSecondsToLocalizedTime } from '@/utils/timeUtils';
import type { CreateTimelockFormProps } from '@/types';

export const CreateTimelockForm: React.FC<CreateTimelockFormProps> = ({
	selectedChain,
	onChainChange,
	selectedStandard,
	minDelay,
	onMinDelayChange,
	owner = '',
	onOwnerChange,
	onDeploy,
	isLoading,
	isSafeWallet = false,
}) => {
	const t = useTranslations('CreateTimelock');
	const params = useParams();
	const locale = params.locale as string;

	const handleChainChange = useCallback(
		(value: string) => {
			onChainChange(Number(value));
		},
		[onChainChange]
	);

	const selectedChainValue = selectedChain.toString();

	const formattedTime = useMemo(() => {
		const seconds = parseInt(minDelay) || 0;
		return formatSecondsToLocalizedTime(seconds, locale === 'zh' ? 'zh' : 'en');
	}, [minDelay, locale]);

	return (
		<div className='bg-white p-6 rounded-lg border-b border-gray-200'>
			<SectionHeader title={t('createTimelock')} description={t('createTimelockDescription')} />

			<div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-6'>
				{/* Select Chain */}
				<div className='md:col-start-2 min-w-[548px]'>
					<ChainSelector
						label={t('selectChain')}
						value={selectedChainValue}
						onChange={handleChainChange}
						placeholder={t('selectChainPlaceholder')}
					/>
				</div>

				{/* Contract Standard Selection */}
				<div className='md:col-start-2'>
					<ContractStandardSelection selectedStandard={selectedStandard} />
				</div>

				{/* minDelay Input */}
				<div className='md:col-start-2 min-w-[548px]'>
					<div className='mb-4'>
						<label className='block text-sm font-medium   mb-1'>{t('minDelay')}</label>
						<div className='flex items-center gap-3'>
							<input
								type='number'
								className='mt-1 block flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white'
								placeholder={t('minDelayPlaceholder')}
								value={minDelay}
								onChange={e => onMinDelayChange(e.target.value)}
								min='0'
								step='1'
							/>
							{minDelay && parseInt(minDelay) > 0 && <div className='text-sm   whitespace-nowrap'>= {formattedTime}</div>}
						</div>
					</div>
				</div>

				{/* Owner Input */}
				<div className='md:col-start-2 min-w-[548px]'>
					<TextInput label={t('admin')} value={owner} onChange={onOwnerChange || (() => {})} placeholder={t('adminPlaceholder')} type='text' />
				</div>
			</div>

			<div className='mt-8 flex justify-end'>
				<Button
					onClick={onDeploy}
					disabled={isLoading}
					className='w-full sm:w-auto bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
					aria-label={isLoading ? t('deploying') : t('deployContract')}>
					{isLoading ?
						<span className='flex items-center'>
							<svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
								<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
								<path
									className='opacity-75'
									fill='currentColor'
									d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
							</svg>
							{t('deploying')}
						</span>
					:	t('deployContract')}
				</Button>
			</div>
		</div>
	);
};

export default CreateTimelockForm;
