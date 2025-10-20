import React, { useMemo, useState, useEffect, useCallback,useRef  } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import SelectInput from '@/components/ui/SelectInput';
import TextInput from '@/components/ui/TextInput';
import TargetABISection from './TargetABISection';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/userStore';
import { useApi } from '@/hooks/useApi';
import { useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import TimelockCompundABI from '@/components/abi/TimelockCompound.json';
import type { EncodingTransactionFormProps } from '@/types';
import { getChainObject } from '@/utils/chainUtils';
import TextAreaInput from '@/components/ui/TextAreaInput';
import { ethers } from 'ethers';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import ChainLabel from '@/components/web3/ChainLabel';
import AddressWarp from '@/components/web3/AddressWarp';

/**
 * Encoding transaction form component for creating timelock transactions
 *
 * @param props - EncodingTransactionForm component props
 * @returns JSX.Element
 */
const EncodingTransactionForm: React.FC<EncodingTransactionFormProps> = ({
	targetCalldata,
	timelockType,
	onTimelockTypeChange,
	timelockMethod,
	onTimelockMethodChange,
	target,
	onTargetChange,
	value,
	onValueChange,
	abiValue,
	onAbiChange,
	functionValue,
	onFunctionChange,
	timeValue,
	onTimeChange,
	argumentValues,
	onArgumentChange,
	onTimelockAddressChange,
	onTimelockDetailsChange,
}) => {
	const t = useTranslations('CreateTransaction');
	const { allTimelocks } = useAuthStore();
	const { data: timelockDetailResponse, request: fetchTimelockDetail } = useApi();
	const [, setIsLoadingDetails] = useState(false);
	const [validationErrors, setValidationErrors] = useState<{ target?: string; value?: string }>({});
	const [currentTimelockDetails, setCurrentTimelockDetails] = useState<Record<string, unknown> | null>(null);
	const [dropdownWidth, setDropdownWidth] = useState<number>(0);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const { id: chainId } = useActiveWalletChain() || {};
	const switchChain = useSwitchActiveWalletChain();

	const validateTarget = (target: string) => {
		if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
			return 'Invalid Ethereum address';
		}
		return undefined;
	};

	const validateValue = (value: string) => {
		try {
			BigInt(value);
			return undefined;
		} catch {
			return 'Invalid bigint value';
		}
	};

	const handleTargetChange = (newValue: string) => {
		onTargetChange(newValue);
		const error = validateTarget(newValue);
		setValidationErrors(prev => ({ ...prev, target: error }));
	};

	const handleValueChange = (newValue: string) => {
		onValueChange(newValue);
		const error = validateValue(newValue);
		setValidationErrors(prev => ({ ...prev, value: error }));
	};

	const timelockOptions = useMemo(() => {
		if (!Array.isArray(allTimelocks)) {
			return [];
		}
		return allTimelocks.map(timelock => ({
			value: String(timelock.id),
			label: `${timelock.remark || 'Timelock'}(${ethers.utils.getAddress(timelock.contract_address)})`,
			address: timelock.contract_address ?? '',
		}));
	}, [allTimelocks]);

	const handleTimelockChange = useCallback(
		async (value: string) => {
			onTimelockTypeChange(value);
			const selectedTimelock = timelockOptions.find(option => option.value === value);
			if (selectedTimelock) {
				onTimelockAddressChange(selectedTimelock.address);

				const fullTimelock = allTimelocks.find(tl => tl.id.toString() === value);
				if (fullTimelock) {
					// First, switch the chain
					if (fullTimelock.chain_id !== chainId) {
						const chainObject = getChainObject(fullTimelock.chain_id);
						if (chainObject) {
							await switchChain(chainObject);
						}
					}

					// Then, fetch the details
					setIsLoadingDetails(true);
					try {
						await fetchTimelockDetail('/api/v1/timelock/detail', {
							chain_id: fullTimelock.chain_id,
							contract_address: fullTimelock.contract_address,
							standard: 'compound',
						});
					} catch (error) {
						console.error('Failed to fetch timelock details:', error);
					} finally {
						setIsLoadingDetails(false);
					}
				}
			}
		},
		[allTimelocks, fetchTimelockDetail, onTimelockAddressChange, onTimelockTypeChange, timelockOptions, chainId, switchChain]
	);

	useEffect(() => {
		if (timelockDetailResponse && timelockDetailResponse.success) {
			setCurrentTimelockDetails(timelockDetailResponse.data.compound_timelocks);
			if (onTimelockDetailsChange) {
				onTimelockDetailsChange(timelockDetailResponse.data.compound_timelocks);
			}
		}
	}, [timelockDetailResponse, onTimelockDetailsChange]);

	const handleTimelockMethodChange = useCallback(() => {
		// 修复 currentTimelockDetails 可能为 null 的问题
		if (currentTimelockDetails && currentTimelockDetails.chain_id && Number(currentTimelockDetails.chain_id) !== chainId) {
			const chainObject = getChainObject(Number(currentTimelockDetails.chain_id));
			switchChain(chainObject);
		}
	}, [chainId, currentTimelockDetails, switchChain]);

	useEffect(() => {
		if (currentTimelockDetails?.chain_id) handleTimelockMethodChange();
	}, [currentTimelockDetails, handleTimelockMethodChange]);

	useEffect(() => {
		if (triggerRef.current) {
			setDropdownWidth(triggerRef.current.offsetWidth);
		}
	}, []);

	const timelockMethodOptions = useMemo(() => {
		if (!timelockType || !allTimelocks || allTimelocks.length === 0) {
			return [];
		}

		const selectedTimelock = allTimelocks.find(tl => tl.id.toString() === timelockType);

		if (!selectedTimelock) {
			return [];
		}

		// 只保留指定的三个函数
		const allowedFunctions = ['cancelTransaction', 'executeTransaction', 'queueTransaction'];
		const functions = TimelockCompundABI.filter(
			item => item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure' && item.name && allowedFunctions.includes(item.name)
		);

		return functions.map(fn => {
			const inputTypes = (fn.inputs || []).map(input => input.type).join(',');
			const signature = `${fn.name}(${inputTypes})`;
			return {
				value: signature,
				label: signature,
			};
		});
	}, [timelockType, allTimelocks]);

	useEffect(() => {
		const currentChainId = currentTimelockDetails?.chain_id;
		if (currentChainId && parseInt(currentChainId as string) !== chainId) {
			handleTimelockChange('');
			handleTimelockMethodChange();
		}
	}, [currentTimelockDetails, chainId, handleTimelockChange, handleTimelockMethodChange]);

	const timeZone = () => {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const timeOffset = -new Date().getTimezoneOffset() / 60;

		return zone ? `(${zone} UTC${timeOffset >= 0 ? '+' : ''}${timeOffset})` : `UTC${timeOffset >= 0 ? '+' : ''}${timeOffset}`;
	};

	function toLocalDateTimeString(date: Date) {
		const pad = (n: number) => n.toString().padStart(2, '0');

		const year = date.getFullYear();
		const month = pad(date.getMonth() + 1); // 月份是 0-based
		const day = pad(date.getDate());
		const hours = pad(date.getHours());
		const minutes = pad(date.getMinutes());

		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	const getTimelockDetails = (timelockId: string) => {
		const c = allTimelocks.find(item => Number(item.id) === Number(timelockId))
		return c
	}

	return (
		<div className='bg-white pt-6 flex flex-col gap-8 items-start'>
			<SectionHeader
				title={t('encodingTransaction.title')}
				description={t('encodingTransaction.description')}
			// icon={<Image src={QuestionIcon} alt='Question Icon' width={15} height={15} />}
			/>
			<div className='flex flex-col space-y-4 w-full'>
				<div className='flex flex-col gap-4 border border-gray-300 rounded-lg p-4' id='timelock-selection'>
					<div className='flex-1 z-50'>
						<div className='block text-sm font-medium mb-1'>{t('encodingTransaction.selectTimelock')}</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild className='flex justify-between items-center cursor-pointer h-9 w-full' style={{ width: '100%' }}>
								<Button ref={triggerRef} variant='outline' size='sm'>
									<div className='flex gap-2 rounded-full'>
										{timelockType && <div className='flex gap-2 justify-center items-center'>
											{(() => {
												const details = timelockType ? getTimelockDetails(timelockType) : null;
												return details?.chain_id ? <ChainLabel chainId={details.chain_id} /> : null;
											})()}
											<span className='font-medium'>
												<AddressWarp address={getTimelockDetails(timelockType)?.contract_address} />
											</span>
											<span className='text-gray-800 text-xs'> {getTimelockDetails(timelockType)?.remark}</span>
										</div>}
										{!timelockType && <div className='flex gap-2 justify-center items-center' style={{ fontWeight: 'normal' }}>
											{t('encodingTransaction.selectTimelock')}
										</div>}
									</div>
									<ChevronDown className='ml-2 h-3 w-3' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent style={{ width: `${dropdownWidth}px` }} className='bg-white border border-gray-200 p-2 flex flex-col rounded-md' align='end' side='bottom' >
								{(!Array.isArray(timelockOptions) || timelockOptions.length === 0) ? (
									<div className={`flex pr-8 py-1 px-1 hover:bg-gray-50 items-center cursor-pointer border-none`}>
										<span className='text-gray-800 text-xs'> {t('encodingTransaction.noTimelocksAvailable')}</span>
									</div>
								) : (
									timelockOptions.map(timelock => {
										const timelockDetails = getTimelockDetails(timelock.value)

										return <DropdownMenuItem
											key={timelock.value}
											onClick={() => handleTimelockChange(timelock.value)}
											className={`flex pr-8 py-1 px-1 hover:bg-gray-50 items-center cursor-pointer border-none`}>
											<div className='flex gap-2 justify-center items-center font-medium text-sm'>
												{timelockDetails?.chain_id && <ChainLabel chainId={timelockDetails.chain_id} />}
												<AddressWarp address={timelockDetails?.contract_address} />
												<span className='text-gray-800 text-xs'> {timelockDetails?.remark}</span>
											</div>
										</DropdownMenuItem>
									})
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div>
						<SelectInput
							label={t('encodingTransaction.selectTimelockMethod')}
							value={timelockMethod}
							onChange={onTimelockMethodChange}
							options={timelockMethodOptions}
							placeholder={timelockType ? t('encodingTransaction.selectTimelockMethodPlaceholder') : t('encodingTransaction.selectTimelockFirstPlaceholder')}
						/>
					</div>
				</div>

				<div id='transaction-details' className='border border-gray-300 rounded-lg p-4 mt-2'>
					<TextInput label={t('encodingTransaction.target')} value={target} onChange={handleTargetChange} placeholder='Target' error={validationErrors.target} />
					<TextInput label={t('encodingTransaction.value')} value={value} onChange={handleValueChange} placeholder='Value' />
					<TextAreaInput
						label={t('encodingTransaction.calldata')}
						value={targetCalldata}
						onChange={() => { }}
						placeholder={t('encodingTransaction.calldataPlaceholder')}
						disabled={true}
						rows={3}
					/>

					<div className='flex flex-col md:flex-row gap-4 items-end'>
						<div className='flex-1'>
							<label className='block text-sm font-medium   mb-1'>
								{t('targetABI.time')} {timeZone()}
							</label>
							<div className='flex gap-4 items-center'>
								<input
									type='datetime-local'
									aria-label={`Transaction execution time ${timeZone()}`}
									value={toLocalDateTimeString(new Date(timeValue * 1000))}
									className='mb-3 max-w-[200px] border border-gray-300 rounded-md px-3 h-[38px] focus:outline-none focus:ring-2 focus:ring-blue-200'
									onChange={e => {
										const date = new Date(e.target.value);
										if (!isNaN(date.getTime())) {
											onTimeChange(Math.floor(date.getTime() / 1000));
										}
									}}
								/>
								<TextInput
									label=''
									value={String(timeValue)}
									onChange={(e: string) => onTimeChange(Number(e))}
									placeholder={t('encodingTransaction.timePlaceholder') || 'Time (seconds)'}
								/>
							</div>
						</div>
					</div>
				</div>

				<div id='target-abi-section' className='border border-gray-300 rounded-lg p-4 mt-2'>
					<TargetABISection
						abiValue={abiValue}
						onAbiChange={onAbiChange}
						functionValue={functionValue}
						onFunctionChange={onFunctionChange}
						argumentValues={argumentValues}
						onArgumentChange={onArgumentChange}
					/>
				</div>
			</div>
		</div>
	);
};

export default EncodingTransactionForm;
