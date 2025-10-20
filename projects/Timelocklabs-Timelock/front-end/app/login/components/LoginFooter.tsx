import { useTranslations } from 'next-intl';
import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';

// 常量定义
const FEATURE_CARD_STYLES = 'currentSection-item text-base  transition-all duration-200  hover:scale-105 hover:cursor-pointer';

const TIMELOCK_FEATURES = ['features.preventUnauthorized', 'features.avoidRisks', 'features.earlyWarning', 'features.industryStandard'] as const;

const PROTOCOL_FEATURES = [
	'protocolFeatures.importExisting',
	'protocolFeatures.readableEncoding',
	'protocolFeatures.eventManagement',
	'protocolFeatures.comprehensiveMonitoring',
] as const;

// 导航按钮组件
interface NavigationButtonProps {
	direction: 'prev' | 'next';
	onClick: () => void;
}

function NavigationButton({ direction, onClick }: NavigationButtonProps) {
	const symbol = direction === 'prev' ? '/ArrowLeft.svg' : '/ArrowRight.svg';
	const ariaLabel = direction === 'prev' ? 'Previous section' : 'Next section';

	return (
		<button
			className='currentSection-item-button transition-all duration-200 hover:bg-gray-700 hover:cursor-pointer active:scale-95'
			onClick={onClick}
			type='button'
		>
			<Image src={symbol} alt={ariaLabel} width={18} height={18} className='transition-transform duration-200' />
		</button>
	);
}

export default function LoginFooter() {
	const t = useTranslations('walletLogin');
	const [currentSection, setCurrentSection] = useState(0);
	const [isVisible, setIsVisible] = useState(false);

	const handlePrevSection = () => {
		setCurrentSection(prev => (prev === 0 ? 1 : 0));
	};

	const handleNextSection = () => {
		setCurrentSection(prev => (prev === 0 ? 1 : 0));
	};

	// 组件挂载后慢慢出现
		useEffect(() => {
			const timer = setTimeout(() => {
				setIsVisible(true);
			}, 300); // 300ms延迟后开始淡入
			return () => clearTimeout(timer);
		}, []);

	// 使用 useMemo 优化特性卡片渲染
	const featureCards = useMemo(() => {
		const features = currentSection === 0 ? TIMELOCK_FEATURES : PROTOCOL_FEATURES;
		return features.map((feature) => (
			<div key={feature} className={FEATURE_CARD_STYLES}>
				{t(feature)}
			</div>
		));
	}, [currentSection, t]);

	const sectionTitle = useMemo(() => {
		return currentSection === 0 ? t('whyTimelock') : t('whyProtocol');
	}, [currentSection, t]);

	return (
		<footer className={`text-[#D4D4D4] absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] flex justify-center items-center border border-gray-900 rounded-xl bg-[#1E1E1E69] backdrop-blur-sm transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
			<div className='flex justify-around items-center w-[96%] gap-10 h-[160px]'>
				<NavigationButton direction='prev' onClick={handlePrevSection} />

				<div className='w-[300px] transform translate-x-10 hover:cursor-pointer'>
					<div className='mb-4'>
						<Image src='/BadgeHelp.svg' alt='Icon' width={30} height={30} />
					</div>
					<div className='text-3xl'>{sectionTitle}</div>
				</div>

				<div className='grid grid-cols-2 gap-4 w-[800px] '>{featureCards}</div>
				<NavigationButton direction='next' onClick={handleNextSection} />
			</div>
		</footer>
	);
}
