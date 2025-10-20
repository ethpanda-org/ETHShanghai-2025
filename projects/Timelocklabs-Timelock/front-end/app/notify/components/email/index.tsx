'use client';
import React, { useState, useEffect, useCallback } from 'react';
import MailboxCard from './components/MailboxCard';
import AddMailboxCard from './components/AddMailboxCard';      
import AddMailboxModal from './components/AddMailboxModal';
import EditMailboxModal from './components/EditMailboxModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { LoadingSkeleton } from '../loadingSkeletons';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';
import SectionHeader from '@/components/ui/SectionHeader';

const EmailNotificationPage: React.FC = () => {
    const t = useTranslations('Notify');
    const [mailboxes, setMailboxes] = useState<Array<{ id: string; email: string; remark?: string; created_at: string; is_verified: boolean }>>([]);
    const [isAddMailboxModalOpen, setIsAddMailboxModalOpen] = useState(false);
    const [isEditMailboxModalOpen, setIsEditMailboxModalOpen] = useState(false);
    const [editingMailbox, setEditingMailbox] = useState<{ id: string; email: string; remark?: string; created_at: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
        isOpen: boolean;
        email: string;
        id: number;
    }>({ isOpen: false, email: '', id: 0 });

    const { request: deleteEmailNotification } = useApi();
    const { request: getEmailNotifications } = useApi();

    // Fetch email notifications
    const fetchEmailNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await getEmailNotifications('/api/v1/emails', { page: 1, page_size: 50 });
            setMailboxes(data?.emails || []);
        } catch (error) {
            console.error('Failed to fetch email notifications:', error);
            toast.error(
                t('fetchEmailListError', {
                    message: error instanceof Error ? error.message : 'Unknown error',
                })
            );
        } finally {
            setIsLoading(false);
        }
    }, [getEmailNotifications, t]);

    useEffect(() => {
        fetchEmailNotifications();
    }, [fetchEmailNotifications]);

    const handleDeleteMailbox = (id: number, email: string) => {
        setDeleteConfirmDialog({ isOpen: true, email, id });
    };

    const confirmDeleteMailbox = async () => {
        try {
            await deleteEmailNotification('/api/v1/emails/delete', { id: deleteConfirmDialog.id });
            toast.success(t('deleteMailboxSuccess'));
            await fetchEmailNotifications(); // Refresh data
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error(
                t('deleteMailboxError', {
                    message: error instanceof Error ? error.message : 'Unknown error',
                })
            );
        } finally {
            setDeleteConfirmDialog({ isOpen: false, email: '', id: 0 });
        }
    };

    const handleAddMailboxSuccess = () => {
        fetchEmailNotifications();
    };

    const handleEditMailbox = (mailbox: { id: string; email: string; remark?: string; created_at: string }) => {
        setEditingMailbox(mailbox);
        setIsEditMailboxModalOpen(true);
    };

    const handleEditMailboxSuccess = () => {
        fetchEmailNotifications();
    };

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <div className='flex flex-col space-y-8'>
            <div className='flex flex-col space-y-8'>
          
                <SectionHeader title={t('title')} description={t('description')} />
          
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {mailboxes.map(
                        mailbox =>
                            mailbox.is_verified && (
                                <MailboxCard
                                    onDelete={handleDeleteMailbox}
                                    onEdit={handleEditMailbox}
                                    key={mailbox.id}
                                    id={parseInt(mailbox.id)}
                                    email={mailbox.email}
                                    remark={mailbox.remark}
                                    created_at={mailbox.created_at}
                                />
                            )
                    )}
                    <AddMailboxCard onClick={() => setIsAddMailboxModalOpen(true)} />
                </div>
            </div>

            {/* Add Mailbox Modal (Conditional Rendering) */}
            <AddMailboxModal isOpen={isAddMailboxModalOpen} onClose={() => setIsAddMailboxModalOpen(false)} onSuccess={handleAddMailboxSuccess} />

            {/* Edit Mailbox Modal (Conditional Rendering) */}
            <EditMailboxModal isOpen={isEditMailboxModalOpen} onClose={() => setIsEditMailboxModalOpen(false)} onSuccess={handleEditMailboxSuccess} initialData={editingMailbox} />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirmDialog.isOpen}
                onClose={() => setDeleteConfirmDialog({ isOpen: false, email: '', id: 0 })}
                onConfirm={confirmDeleteMailbox}
                title={t('confirmDialog.title')}
                description={t('confirmDialog.description', { email: deleteConfirmDialog.email })}
                confirmText={t('confirmDialog.confirmText')}
                cancelText={t('confirmDialog.cancelText')}
                variant='destructive'
            />
        </div>
    );
};

export default EmailNotificationPage;
