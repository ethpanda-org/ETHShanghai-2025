'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EncodingTransactionForm from './components/EncodingTransactionForm';
import EncodingPreview from './components/EncodingPreview';
import MailboxSelection from './components/MailboxSelection';
import { useTranslations } from 'next-intl';
import { useTimelockTransaction } from '@/hooks/useTimelockTransaction';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';

import { useAuthStore } from '@/store/userStore';
import { toast } from 'sonner';
import generatePreview from '@/utils/generatePreview';
import EthereumParamsCodec from '@/utils/ethereumParamsCodec';
import { Send } from 'lucide-react';
import { createErrorMessage } from '@/hooks/useHookUtils';

const TransactionEncoderPage: React.FC = () => {
	const router = useRouter();
	const t = useTranslations('CreateTransaction');
	const { sendTransaction } = useTimelockTransaction();
	const { address } = useActiveAccount() || {};
	const { id: chainId } = useActiveWalletChain() || {};
	const { allTimelocks } = useAuthStore();

	// Form States
	const [timelockType, setTimelockType] = useState('');
	const [timelockMethod, setTimelockMethod] = useState('');
	const [timelockAddress, setTimelockAddress] = useState('');
	const [target, setTarget] = useState('');
	const [value, setValue] = useState('');
	const [abiValue, setAbiValue] = useState('');
	const [functionValue, setFunctionValue] = useState('');
	const [timeValue, setTimeValue] = useState(0);
	const [argumentValues, setArgumentValues] = useState<string[]>([]);
	const [selectedMailbox, setSelectedMailbox] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	// Preview State
	const [previewContent, setPreviewContent] = useState('');
	const [targetCalldata, setTargetCallData] = useState('');
	const [timelockCalldata, setTimelockCalldata] = useState('');

	useEffect(() => {
		if (!timeValue) {
			const now = new Date();
			now.setDate(now.getDate() + 2);
			now.setHours(14, 0, 0, 0);
			const timestamp = Math.floor(now.getTime() / 1000);
			setTimeValue(timestamp);
		}
	}, [timeValue]);

	useEffect(() => {
		setTimelockCalldata('');
		if (targetCalldata) {
			try {
				if (!timelockMethod) {
					throw new Error('Invalid timelock method');
				}

				const ethereumParamsCodec = new EthereumParamsCodec()
				const result = ethereumParamsCodec.encodeByFunctionSigAndParams(timelockMethod, [target, value, functionValue, targetCalldata, String(timeValue)])
				if (result.success) {
					setTimelockCalldata(result.encodedData);
				} else {
					console.error('Failed to encode params:', result.error);
					setTimelockCalldata('');
				}
			} catch (err) {
				setTargetCallData('');
				console.error('Failed to encode calldata:', err);
			}
		}
	}, [targetCalldata, value, timelockMethod, timeValue, functionValue, target]);

	useEffect(() => {
		setTargetCallData(''); // Reset calldata when function or arguments change
		if (!!functionValue && argumentValues.length > 0) {
			try {
				const ethereumParamsCodec = new EthereumParamsCodec();
				const result = ethereumParamsCodec.encodeParams(functionValue, argumentValues);
				if (result.success) {
					setTargetCallData(result.encodedData);
				} else {
					console.error('Failed to encode params:', result.error);
					setTargetCallData('');
				}
			} catch {
				setTargetCallData('');
			}
		}
	}, [functionValue, argumentValues]);



	// Handle argument changes
	const handleArgumentChange = (index: number, value: string) => {
		const newArgumentValues = [...argumentValues];
		newArgumentValues[index] = value;
		setArgumentValues(newArgumentValues);
	};

	// Handle function changes and clear arguments
	const handleFunctionChange = (value: string) => {
		setFunctionValue(value);
		setArgumentValues([]); // Clear all argument values when function changes
	};

	// Handle ABI changes and clear arguments and function
	const handleAbiChange = (value: string) => {
		setAbiValue(value);
		setFunctionValue(''); // Clear selected function when ABI changes
		setArgumentValues([]); // Clear all argument values when ABI changes
	};

	// Effect to update preview content whenever form fields change
	useEffect(() => {
		setPreviewContent(
			generatePreview({
				allTimelocks,
				timelockType,
				functionValue,
				argumentValues,
				selectedMailbox,
				timeValue,
				targetCalldata,
				abiValue,
				address,
				timelockAddress,
				timelockMethod,
				target,
				value,
				timelockCalldata,
			})
		);
	}, [
		target,
		value,
		timeValue,
		functionValue,
		argumentValues,
		address,
		timelockAddress,
		abiValue,
		timelockType,
		allTimelocks,
		timelockCalldata,
		selectedMailbox,
		targetCalldata,
		timelockMethod,
	]);

	const handleSendTransaction = async () => {
		if (!address) {
			toast.error(t('pleaseConnectWallet'));
			return;
		}

		if (!chainId) {
			toast.error(t('pleaseSelectNetwork'));
			return;
		}

		// Validate required fields
		if (!timelockAddress || !target || !functionValue || !timeValue) {
			toast.error(t('pleaseFillInAllRequiredFields'));
			return;
		}

		try {
			setIsSubmitting(true);

			await sendTransaction({
				// timelockAddress,
				toAddress: timelockAddress,
				calldata: timelockCalldata,
				value: value || '0', // Default to '0' if not specified
			});

			toast.success(t('success'));

			router.push('/transactions');
		} catch (error) {
			console.error('error', error);
			toast.error(t('failed', { message: createErrorMessage(error)}));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className='min-h-screen bg-withe'>
			<div className='mx-auto flex flex-col'>
				<div className='flex justify-between gap-32'>
					<div className='w-1/2 w-max-[550px]'>
						<EncodingTransactionForm
							targetCalldata={targetCalldata}
							timelockType={timelockType}
							onTimelockTypeChange={setTimelockType}
							timelockMethod={timelockMethod}
							onTimelockMethodChange={setTimelockMethod}
							onTimelockAddressChange={setTimelockAddress}
							target={target}
							onTargetChange={setTarget}
							value={value}
							onValueChange={setValue}
							abiValue={abiValue}
							onAbiChange={handleAbiChange}
							functionValue={functionValue}
							onFunctionChange={handleFunctionChange}
							timeValue={timeValue}
							onTimeChange={setTimeValue}
							argumentValues={argumentValues}
							onArgumentChange={handleArgumentChange}
						/>
					</div>
					<div className='flex flex-col gap-4 w-1/2'>
						<EncodingPreview previewContent={previewContent} />
						<MailboxSelection selectedMailbox={selectedMailbox} onMailboxChange={setSelectedMailbox} />
						<div className='mt-auto flex justify-end'>
							<button
								type='button'
								onClick={handleSendTransaction}
								disabled={isSubmitting}
								className='cursor-pointer text-sm bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center h-[36px] text-sm disabled:opacity-50 disabled:cursor-not-allowed px-4'>
								<Send className='w-4 h-4 mr-2' />
								{isSubmitting ? t('submitting') : t('sendTransactionButton')}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TransactionEncoderPage;
