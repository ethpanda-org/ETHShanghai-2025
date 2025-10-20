import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import RadioButtonOption from './RadioButtonOption';
import type { ContractStandardSelectionProps, StandardOptionConfig } from '@/types';

const STANDARD_OPTIONS: StandardOptionConfig[] = [
	{
		value: 'compound',
		labelKey: 'compoundStandardLabel',
		descriptionKey: 'compoundStandardDescription',
	},
] as const;

const ContractStandardSelection: React.FC<ContractStandardSelectionProps> = ({ selectedStandard }) => {
	const t = useTranslations('CreateTimelock');

	const standardOptions = useMemo(() => STANDARD_OPTIONS, []);

	return (
		<div className='mb-4'>
			<label className='block text-sm font-medium   mb-2'>{t('selectContractStandard')}</label>
			<div className='space-y-4'>
				{standardOptions.map(option => (
					<RadioButtonOption
						key={option.value}
						id={`${option.value}-standard`}
						name='contractStandard'
						value={option.value}
						label={t(option.labelKey || option.label || '')}
						description={t(option.descriptionKey || option.description || '')}
						checked={selectedStandard === option.value}
					/>
				))}
			</div>
		</div>
	);
};

export default ContractStandardSelection;
