'use client';

import React from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ModalProps, VoidCallback } from '@/types';

interface ConfirmDialogProps extends ModalProps {
	onConfirm: VoidCallback;
	description: string;
	confirmText?: string;
	cancelText?: string;
	variant?: 'default' | 'destructive';
}

/**
 * Confirmation dialog component with customizable actions
 *
 * @param props - ConfirmDialog component props
 * @returns JSX.Element
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title = 'Confirm Action',
	description,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	variant = 'default',
}) => {
	const confirmButtonClassName = variant === 'destructive' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600' : '';

	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onClose}>{cancelText}</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} className={confirmButtonClassName}>
						{confirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default ConfirmDialog;
