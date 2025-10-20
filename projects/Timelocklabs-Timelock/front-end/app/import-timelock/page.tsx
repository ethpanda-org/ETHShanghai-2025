'use client';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import SectionHeader from '@/components/ui/SectionHeader';
import TextInput from '@/components/ui/TextInput';
import ChainSelector from '@/components/web3/ChainSelector';
import SelectInput from '@/components/ui/SelectInput';
import CheckParametersModal from './components/CheckParametersModal';
import QuestionIcon from '@/public/QuestionIcon.svg';
import { useTimelockImport, TimelockParameters } from '@/hooks/useTimelockImport';
import { toast } from 'sonner';
import { ImportTimelockRequest } from '@/types';
import { useActiveWalletChain } from 'thirdweb/react';
import { useRouter } from 'next/navigation';
import { compoundTimelockAbi } from '@/contracts/abis/CompoundTimelock';
import { useApi } from '@/hooks/useApi';

const ImportTimelockPage: React.FC = () => {
	const t = useTranslations('ImportTimelock');

	const standardOptions = [{ value: 'compound', label: 'Compound' }];
	const [selectedChain, setSelectedChain] = useState('');
	const [contractAddress, setContractAddress] = useState('');
	const [contractStandard, setContractStandard] = useState('compound');
	const [remarks, setRemarks] = useState('');
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [detectedParameters, setDetectedParameters] = useState<TimelockParameters | null>(null);
	const [currentChinId, setCurrentChinId] = useState('');

	const { id: chainId } = useActiveWalletChain() || {};

	const { isLoading: isDetecting, parameters, fetchTimelockParameters, validateContractAddress, clearParameters } = useTimelockImport();

	const { request: importTimelockRequest, data: importTimelockData } = useApi();
	const router = useRouter();

	useEffect(() => {
		if (!selectedChain && chainId) {
			setSelectedChain(chainId.toString());
		}
	}, [chainId, selectedChain]);

	useEffect(() => {
		if (parameters && parameters.isValid) {
			setDetectedParameters(parameters);
		}
	}, [parameters]);

	useEffect(() => {
		if (detectedParameters) {
			setDetectedParameters(null);
			clearParameters();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [contractAddress, clearParameters]);

	const handleNextStep = async () => {
		if (!selectedChain) {
			toast.error(t('errors.selectChain'));
			return;
		}

		if (!contractAddress) {
			toast.error(t('errors.enterContractAddress'));
			return;
		}

		if (!contractStandard) {
			toast.error(t('errors.selectContractStandard'));
			return;
		}

		try {
			const isValid = await validateContractAddress(contractAddress);

			if (!isValid) {
				toast.error(t('errors.invalidContractAddress'));
				return;
			}

			const detectedParams = await fetchTimelockParameters(contractAddress);
			if (!detectedParams.isValid) {
				toast.error(t('errors.failedToDetectParameters'));
				return;
			}

			setDetectedParameters(detectedParams);
			setIsModalOpen(true);
		} catch (error) {
			console.error('Detection failed:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			toast.error(t('errors.detectionFailed', { message: errorMessage }));
		}
	};

	const handleConfirmParams = async () => {
		if (!detectedParameters || !detectedParameters.isValid) {
			toast.error(t('errors.invalidTimelockParameters'));
			return;
		}

		const chainId = parseInt(selectedChain);
		const importData: ImportTimelockRequest = {
			chain_id: chainId,
			contract_address: contractAddress,
			standard: detectedParameters.standard!,
			remark: remarks || t('defaultRemark'),
			is_imported: true, // Always true for imported contracts
		};

		await importTimelockRequest('/api/v1/timelock/create-or-import', importData);
	};

	useEffect(() => {
		if (importTimelockData?.success) {
			toast.success(t('success.importSuccess'));
			router.push('/timelocks');
		} else if (importTimelockData && !importTimelockData.success) {
			toast.error(t('failedToImportTimelock'));
		}
	}, [importTimelockData, router, t]);

	useEffect(()=>{
		if(!chainId){
			return;
		}
		setCurrentChinId(chainId.toString() || '')
		// eslint-disable-next-line react-hooks/exhaustive-deps
	},[detectedParameters])

	return (
		<>
			<div className=' bg-white p-8 flex flex-col '>
				<div className='flex-grow bg-white'>
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 border-b border-gray-200'>
						<div className='flex flex-col pr-8'>
							<SectionHeader title={t('title')} description={t('description')} icon={<Image src={QuestionIcon} alt='Question Icon' width={15} height={15} />} />
						</div>
						<div className='flex flex-col pl-8'>
							<ChainSelector
								label={t('selectChain')}
								value={selectedChain}
								onChange={setSelectedChain}
								placeholder={t('selectChainPlaceholder')}
								autoSwitchChain={true}
							/>
							<TextInput label={t('contractAddress')} value={contractAddress} onChange={(e: string) => setContractAddress(e)} placeholder={t('contractAddressPlaceholder')} />
							<SelectInput
								label={t('contractStandard')}
								value={contractStandard}
								onChange={setContractStandard}
								options={standardOptions}
								placeholder={t('contractStandardPlaceholder')}
							/>
							<TextInput label={t('remarks')} value={remarks} onChange={setRemarks} placeholder={t('remarksPlaceholder')} />
						</div>
					</div>
					<div className='mx-auto flex justify-end mt-8'>
						<button
							type='button'
							onClick={handleNextStep}
							disabled={isDetecting || !selectedChain || !contractAddress || !contractStandard}
							className='bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed'>
							{isDetecting ? t('detecting') : t('nextStep')}
						</button>
					</div>
				</div>
				<CheckParametersModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					onConfirm={handleConfirmParams}
					abiText={JSON.stringify(compoundTimelockAbi, null, 2)}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					parameters={{ chainId: currentChinId, ...detectedParameters! as any }}
				/>
			</div>
		</>
	);
};

export default ImportTimelockPage;
