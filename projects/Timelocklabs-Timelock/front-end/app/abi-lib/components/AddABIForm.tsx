'use client'; // Required for useState and event handlers

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Assuming TextInput is a wrapper around Input or similar
import { Label } from '@/components/ui/label'; // Assuming you have a Label component or use Shadcn/ui Label
import ABITextarea from '@/components/ui/ABITextarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

import type { AddABIFormProps } from '@/types';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

const AddABIForm: React.FC<AddABIFormProps> = ({ isOpen, onClose }) => {
	const t = useTranslations('ABI-Lib.addForm');
	const [name, setName] = useState<string>('');
	const [description, setDescription] = useState<string>('');
	const [abi, setAbi] = useState<string>('');
	const { request: addAbiReq } = useApi();
	const { request: validateAbiReq } = useApi();

	const handleCancel = () => {
		setName('');
		setDescription('');
		setAbi('');
		onClose();
	};


	const handleAddABI = async (name: string, description: string, abi_content: string) => {
		try {
			// First validate the ABI
			const validateResult = await validateAbiReq('/api/v1/abi/validate', { abi_content });

			if (!validateResult?.success || !validateResult.data?.is_valid) {
				toast.error(
					t('validateAbiError', {
						message: validateResult?.error?.message || 'Invalid ABI format',
					})
				);
				return;
			}
			await addAbiReq('/api/v1/abi', {
				name,
				description,
				abi_content,
			});
		} catch (error) {
			toast.error(
				t('addAbiError', {
					message: error instanceof Error ? error.message : 'Unknown error',
				})
			);
		}
	};
	const handleSave = async () => {
		if (name.trim() && description.trim() && abi.trim()) {
			await handleAddABI(name, description, abi);
			setName('');
			setDescription('');
			setAbi('');
			onClose(); // Close the dialog after saving
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='w-[558px] overflow-hidden'>
				{/* Added overflow-hidden */}
				<DialogHeader>
					<DialogTitle>{t('title')}</DialogTitle>
					<DialogDescription>{t('description')}</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4 overflow-hidden'>
					{/* Name Input Field - Vertical Layout */}
					<div className='space-y-2'>
						<Label htmlFor='abiName'>{t('nameLabel')}</Label>
						<Input id='abiName' value={name} onChange={e => setName(e.target.value)} placeholder={t('nameLabel')} />
					</div>
					{/* Description Input Field - Vertical Layout */}
					<div className='space-y-2'>
						<Label htmlFor='abiDescription'>{t('descriptionLabel')}</Label>
						<Input id='abiDescription' value={description} onChange={e => setDescription(e.target.value)} placeholder={t('descriptionLabel')} />
					</div>
					<ABITextarea id='abiContent' label={t('contentLabel')} value={abi} onChange={setAbi} placeholder={t('contentLabel')} rows={5} />
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button className=' cursor-pointer' type='button' variant='outline' onClick={handleCancel}>
							{t('cancelButton')}
						</Button>
					</DialogClose>
					<Button className=' cursor-pointer' type='button' onClick={handleSave}>
						{t('addButton')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default AddABIForm;
