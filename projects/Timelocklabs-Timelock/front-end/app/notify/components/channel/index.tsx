import AddChannelCard from './components/AddChannelCard';
import AddChannelModal from './components/AddChannelModal';
import { useEffect, useState, useCallback } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import { useTranslations } from 'next-intl';
import ChannelCard from './components/ChannelCard';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import { LoadingSkeleton } from '../loadingSkeletons';

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

interface ChannelConfig {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
	user_address: string;
	is_active: boolean;
	webhook_url?: string;
	secret?: string;
	bot_token?: string;
	chat_id?: string;
}

export default function Channel() {
	const t = useTranslations('Notify.channel');
	const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
	const [channels, setChannels] = useState<Channel[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const { request: deleteChannelApi } = useApi();
	const { request: getChannelsApi } = useApi();
	const [editCurrentChannel, setEditCurrentChannel] = useState<Channel>({
		created_at: '',
		id: '',
		is_active: false,
		name: '',
		secret: '',
		updated_at: '',
		user_address: '',
		webhook_url: '',
		channel: '',
	});

	// 获取频道列表
	const fetchChannels = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await getChannelsApi('/api/v1/notifications/configs');
			if (response && response.data) {
				const data: Channel[] = [];
				
				// 处理飞书配置
				if (response.data.feishu_configs && Array.isArray(response.data.feishu_configs)) {
					data.push(...response.data.feishu_configs.map((item: ChannelConfig) => ({
						...item,
						channel: 'feishu',
						id: `feishu_${item.id}`,
						webhook_url: item.webhook_url || '',
						secret: item.secret || ''
					})));
				}
				
				// 处理Lark配置
				if (response.data.lark_configs && Array.isArray(response.data.lark_configs)) {
					data.push(...response.data.lark_configs.map((item: ChannelConfig) => ({
						...item,
						channel: 'lark',
						id: `lark_${item.id}`,
						webhook_url: item.webhook_url || '',
						secret: item.secret || ''
					})));
				}
				
				// 处理Telegram配置
				if (response.data.telegram_configs && Array.isArray(response.data.telegram_configs)) {
					data.push(...response.data.telegram_configs.map((item: ChannelConfig) => ({
						...item,
						channel: 'telegram',
						id: `telegram_${item.id}`,
						bot_token: item.bot_token || '',
						chat_id: item.chat_id || '',
						webhook_url: '',
						secret: ''
					})));
				}
				
				setChannels(data);
			}
		} catch (error) {
			console.error('Failed to fetch channels:', error);
		} finally {
			setIsLoading(false);
		}
	}, [getChannelsApi]);

	useEffect(() => {
		fetchChannels();
	}, [fetchChannels]);

	// 删除频道
	const handleDeleteChannel = async (id: string | number) => {
		const channel = channels.find(channel => channel.id === id);
		if (!channel) {
			toast.error(t('channelNotFound'));
			return;
		}
		
		try {
			await deleteChannelApi(`/api/v1/notifications/delete`, {
				channel: channel.channel,
				name: channel.name,
			});
			setChannels(channels.filter(ch => ch.id !== id));
			toast.success(t('channelDeletedSuccessfully'));
		} catch (error) {
			console.error('Failed to delete channel:', error);
			toast.error(t('deleteChannelError'));
		}
	};

	// 编辑频道
	const handleEditChannel = (channel: Channel) => {
		setEditCurrentChannel(channel);
		setIsAddChannelModalOpen(true);
	};

	// 添加/编辑频道成功后的回调
	const handleAddChannelSuccess = () => {
		setIsAddChannelModalOpen(false);
		setEditCurrentChannel({
			created_at: '',
			id: '',
			is_active: false,
			name: '',
			secret: '',
			updated_at: '',
			user_address: '',
			webhook_url: '',
			channel: '',
		});
		fetchChannels(); // 重新获取频道列表
	};

	// 关闭模态框的回调
	const handleCloseModal = () => {
		setIsAddChannelModalOpen(false);
		setEditCurrentChannel({
			created_at: '',
			id: '',
			is_active: false,
			name: '',
			secret: '',
			updated_at: '',
			user_address: '',
			webhook_url: '',
			channel: '',
		});
	};

	if (isLoading) {
		return <LoadingSkeleton />;
	}

	return (
		<div>
			<div className='flex-grow'>
				<SectionHeader title={t('title')} description={t('description')} />
			</div>
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
				{channels.map(channel => (
					<ChannelCard onDelete={handleDeleteChannel} onEdit={handleEditChannel} key={channel.id} channelData={channel} />
				))}
				<AddChannelCard onClick={() => setIsAddChannelModalOpen(true)} />
			</div>
			<AddChannelModal isOpen={isAddChannelModalOpen} onClose={handleCloseModal} onSuccess={handleAddChannelSuccess} editCurrentChannel={editCurrentChannel} />
		</div>
	);
}
