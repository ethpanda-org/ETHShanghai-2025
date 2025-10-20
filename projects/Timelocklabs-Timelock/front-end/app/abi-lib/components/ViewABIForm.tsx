'use client'; // Required for useState and event handlers

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import type { ViewABIFormProps } from '@/types';

const ViewABIForm: React.FC<ViewABIFormProps> = ({ isOpen, onClose, viewAbiContent }) => {
	const t = useTranslations('ABI-Lib.viewForm');

	if (!isOpen || !viewAbiContent) {
		return null;
	}

	// Safely format ABI content
	const formatAbiContent = (content: string) => {
		try {
			return JSON.stringify(JSON.parse(content), null, 2);
		} catch (error) {
			console.log(error);
			return content; // Return original content if it's not valid JSON
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='w-[558px] overflow-hidden'>
				<DialogHeader>
					<DialogTitle>{t('title')}</DialogTitle>
				</DialogHeader>
				<div className='grid gap-4 overflow-hidden'>
					<div className='space-y-2'>
						<Label>{t('nameLabel')}</Label>
						<Input defaultValue={viewAbiContent.name} readOnly className='bg-gray-50 cursor-default' autoFocus={false} tabIndex={-1}/>
					</div>
					<div className='space-y-2'>
						<Label>{t('descriptionLabel')}</Label>
						<Textarea defaultValue={viewAbiContent.description} readOnly className='bg-gray-50 cursor-default resize-none'autoFocus={false} tabIndex={-1}/>
					</div>
					<div className='space-y-2'>
						<Label>{t('interfaceDetails')}</Label>
						<Textarea className='h-[300px] bg-gray-50 cursor-default resize-none font-mono text-sm' defaultValue={formatAbiContent(viewAbiContent.abi_content)} readOnly autoFocus={false} tabIndex={-1}/>
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button type='button' variant='outline' onClick={() => onClose()}>
							{t('closeButton')}
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ViewABIForm;
