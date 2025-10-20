import React from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { formatDateWithYear } from '@/utils/utils';
import copyToClipboard from '@/utils/copy';
import Tag from '@/components/tableContent/TableTag';
import Image from 'next/image';
interface ChannelCardProps {
	onDelete: (id: string) => void;
	onEdit: (channel: ChannelData) => void;
	channelData: ChannelData;
}

interface ChannelData {
    "created_at": string,
    "id": string,
    "is_active": boolean,
    "name": string,
    "secret": string,
    "updated_at": string,
    "user_address": string,
    "webhook_url": string,
    "channel": string
}

import feishu from '../images/feishu.png';
import lark from '../images/lark.png';
import telegram from '../images/telegram.png';
import { StaticImageData } from 'next/image';

type ChannelType = 'feishu' | 'lark' | 'telegram';

const channelIcon: Record<ChannelType, StaticImageData> = {
	feishu,
	lark,
	telegram,
};

const ChannelCard: React.FC<ChannelCardProps> = ({ channelData, onDelete, onEdit }) => {
	const t = useTranslations('Notify.channel');
	const { id, channel:type, name:remark, created_at } = channelData;

	const handleDeleteClick = () => {
		onDelete(id);
	};

	const handleEditClick = () => {
		onEdit(channelData);
	};

	return (
		<div className='bg-white rounded-lg  border border-gray-200 flex flex-col justify-between h-auto relative'>
			<div className='p-6'>
				<div className='text-lg flex items-center gap-2 font-semibold mb-1 cursor-pointer' onClick={() => copyToClipboard(type)}>
				</div>
				<div className='my-2'><Tag label={remark || '-'} colorType='green' /></div>
				<div className='text-xs'>
					<div>
						<strong>{t('addedAt')}:</strong> {formatDateWithYear(created_at) || '-'}
					</div>
				</div>
			</div>
			<div className='absolute top-[25px] right-[25px]'>
				{channelIcon[type as ChannelType] && (
					<Image src={channelIcon[type as ChannelType]} alt={type} width={40} height={40} />
				)}
			</div>
			<div className='pt-4 pr-4 border-t border-gray-200 flex justify-end h-[64px] space-x-2'>
				<button
					type="button"
					onClick={handleEditClick}
					className='w-[85px] h-[32px] text-center inline-flex items-center py-2 px-2 gap-py-2 border border-gray-300 rounded-md  text-sm font-medium   bg-white hover:bg-gray-50 transition-colors cursor-pointer'>
					<span className='flex items-center gap-2 text-[#0A0A0A]'>
						<PencilIcon className='w-4 h-4' />
						{t('edit')}
					</span>
				</button>
				<button
					type="button"
					onClick={handleDeleteClick}
					className='w-[85px] h-[32px] text-center inline-flex items-center py-2 px-2 gap-py-2 border border-gray-300 rounded-md  text-sm font-medium   bg-white hover:bg-gray-50 transition-colors cursor-pointer'>
					<span className='flex items-center gap-2 text-[#0A0A0A]'>
						<TrashIcon className='w-4 h-4' />
						{t('delete')}
					</span>
				</button>

			</div>
		</div>
	);
};

export default ChannelCard;
