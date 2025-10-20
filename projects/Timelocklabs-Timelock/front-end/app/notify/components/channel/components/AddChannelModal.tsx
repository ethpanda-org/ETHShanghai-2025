// components/channel/AddChannelModal.tsx
import React, { useEffect, useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader'; // Adjust path
import TextInput from '@/components/ui/TextInput'; // Adjust path
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

import FeishuIcon from '../images/feishu.png';
import LarkIcon from '../images/lark.png';
import TelegramIcon from '../images/telegram.png';
interface AddChannelModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	editCurrentChannel?: Channel;
}

interface Channel {
	created_at: string;
	id: string;
	is_active: boolean;
	name: string;
	secret: string;
	updated_at: string;
	user_address: string;
	webhook_url: string;
	channel: string;
	bot_token?: string;
	chat_id?: string;
}

export interface ChannelItem {
	type: string;
	name: string;
	icon: string;
	configLabel: string;
}

const channelList: ChannelItem[] = [
	{
		type: 'feishu',
		name: 'Feishu',
		icon: FeishuIcon.src,
		configLabel: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxxx-xxxx-xxxx-xxxx',
	},
	{
		type: 'lark',
		name: 'Lark',
		icon: LarkIcon.src,
		configLabel: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxxx-xxxx-xxxx-xxxx',
	},
	{
		type: 'telegram',
		name: 'Telegram',
		icon: TelegramIcon.src,
		configLabel: 'xxxxxx:xxxxxxxxxxxxxxxxxxxxxxx',
	},
];

const initialChannel = {
	type: 'feishu',
	name: 'Feishu',
	icon: FeishuIcon.src,
	configLabel: 'https://open.larksuite.com/open-apis/bot/v2/hook/xxxx-xxxx-xxxx-xxxx',
};

const AddChannelModal: React.FC<AddChannelModalProps> = ({ isOpen, onClose, onSuccess, editCurrentChannel }) => {
	const t = useTranslations('Notify.addChannelModal');
	const [webhook_url, setWebhook_url] = useState('');
	const [secret, setSecret] = useState('');
	const [botToken, setBotToken] = useState('');
	const [chatId, setChatId] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { request: addChannelApi } = useApi();
	const [currentChannel, setCurrentChannel] = useState<ChannelItem>(channelList[0] || initialChannel);
	const [channelName, setChannelName] = useState('');
	const [disabled, setDisabled] = useState(false);

	useEffect(() => {
		if (editCurrentChannel && editCurrentChannel.id && editCurrentChannel.channel) {
			setDisabled(true);
			const channel = channelList.find(item => item.type === editCurrentChannel.channel);
			if (channel) {
				setCurrentChannel(channel);
				setChannelName(editCurrentChannel.name || '');
				if (['feishu', 'lark'].includes(editCurrentChannel.channel)) {
					setWebhook_url(editCurrentChannel.webhook_url || '');
					setSecret(editCurrentChannel.secret || '');
					// 清空telegram字段
					setBotToken('');
					setChatId('');
				} else if (editCurrentChannel.channel === 'telegram') {
					setBotToken(editCurrentChannel.bot_token || '');
					setChatId(editCurrentChannel.chat_id || '');
					// 清空webhook字段
					setWebhook_url('');
					setSecret('');
				}
			}
		} else {
			// Reset to default when not editing
			resetForm();
			setDisabled(false);
		}
	}, [editCurrentChannel]);

	const resetForm = () => {
		setWebhook_url('');
		setSecret('');
		setBotToken('');
		setChatId('');
		setCurrentChannel(channelList[0] || initialChannel);
	};

	const handleCancel = () => {
		resetForm();
		onClose();
	};

	const validateForm = (): boolean => {
		if (!channelName.trim()) {
			toast.error(t('channelNameRequired'));
			return false;
		}
		if (currentChannel.type === 'telegram') {
			if (!botToken.trim()) {
				toast.error(t('configRequired'));
				return false;
			}
			if (!chatId.trim()) {
				toast.error(t('configRequired'));
				return false;
			}
		} else {
			if (!webhook_url.trim()) {
				toast.error(t('configRequired'));
				return false;
			}
		}
		return true;
	};

	const handleSave = async () => {
		if (!validateForm()) {
			return;
		}

		try {
			setIsSubmitting(true);

			// 根据渠道类型添加特定字段
			const payload =
				currentChannel.type === 'telegram'
					? { channel: currentChannel.type, bot_token: botToken, chat_id: chatId, name: channelName }
					: { channel: currentChannel.type, webhook_url, secret, name: channelName };

			// 判断是否为编辑模式
			const isEditMode = editCurrentChannel && editCurrentChannel.id && editCurrentChannel.channel;

			// 根据是否为编辑模式选择API端点
			const apiEndpoint = isEditMode ? '/api/v1/notifications/update' : '/api/v1/notifications/create';

			await addChannelApi(apiEndpoint, payload);

			const successMessage = isEditMode ? t('channelUpdatedSuccessfully') : t('channelAddedSuccessfully');

			toast.success(successMessage);
			onSuccess();
			resetForm();
		} catch (error) {
			console.error('Failed to save channel:', error);
			toast.error(
				t('saveChannelError', {
					message: error instanceof Error ? error.message : t('unknownError'),
				})
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) {
		return null; // Don't render anything if the modal is not open
	}

	return (
		<div
			className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
			onClick={e => e.target === e.currentTarget && handleCancel()}
			role='dialog'
			aria-modal='true'
			aria-labelledby='modal-title'>
			<div
				className='bg-white rounded-lg border border-gray-200 flex flex-col shadow-xl'
				style={{ width: 558, maxHeight: '90vh', overflowY: 'auto' }}
				onClick={e => e.stopPropagation()}>
				<div className='p-6'>
					<SectionHeader title={editCurrentChannel ? t('editTitle') : t('title')} description={t('description')} />
					<div className='flex flex-col mb-4'>
						<div className='block text-sm font-medium mb-1'>{t('method')}</div>
						<div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild className='flex justify-between items-center cursor-pointer h-9 w-38' disabled={disabled}>
									<Button variant='outline' size='sm'>
										<div className='flex gap-2 rounded-full overflow-hidden'>
											{currentChannel?.icon && <Image src={currentChannel.icon} alt={currentChannel.name ?? ''} width={20} height={20} />}
											<div className='hidden sm:inline'>{currentChannel?.name ?? 'Unsupported Chain'}</div>
										</div>
										<ChevronDown className='ml-2 h-3 w-3' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className='w-38 bg-white border border-gray-200 p-2 flex flex-col gap-2 rounded-md' align='end'>
									{Array.isArray(channelList) &&
										channelList.map(channel => (
											<DropdownMenuItem
												key={channel.type}
												onClick={() => setCurrentChannel(channel)}
												className={`flex gap-2 items-center cursor-pointer hover:bg-gray-50 p-2 rounded ${currentChannel.type === channel.type ? 'bg-gray-100' : ''}`}>
												<div className='flex gap-2'>
													<Image className='rounded-full overflow-hidden h-[20px] w-[20px]' src={channel.icon} alt={channel.name} width={20} height={20} />
													<span className='font-medium text-sm'>{channel.name}</span>
												</div>
											</DropdownMenuItem>
										))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
					<TextInput label={t('channelName')} value={channelName} onChange={setChannelName} disabled={disabled} />
					{['telegram'].includes(currentChannel?.type) ? (
						<>
							<TextInput label='Bot Token' value={botToken} onChange={setBotToken} placeholder={currentChannel?.configLabel} />
							<TextInput label='Chat ID' value={chatId} onChange={setChatId} />
						</>
					) : (
						<>
							<TextInput label='Webhook URL' value={webhook_url} onChange={setWebhook_url} placeholder={currentChannel?.configLabel} />
							<TextInput label={`Secret ${t('optional')}`} value={secret} onChange={setSecret} placeholder="*****" className='bg-gray-50'/>
						</>
					)}
				</div>

				<div className='flex justify-end space-x-3 mt-auto p-6 border-t border-gray-200'>
					<Button variant='outline' onClick={handleCancel} disabled={isSubmitting} className='px-6 py-2'>
						{t('cancel')}
					</Button>
					<Button onClick={handleSave} disabled={isSubmitting} className='px-6 py-2'>
						{isSubmitting ? t('saveLoading') : t('save')}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default AddChannelModal;
