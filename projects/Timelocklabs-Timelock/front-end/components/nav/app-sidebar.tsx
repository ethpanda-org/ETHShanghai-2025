'use client';

import * as React from 'react';
import { 
	Clock, 
	Frame, 
	ListTodo, 
	BellDot, 
	FileCode, 
	Shield, 
	Box, 
	House, 
	Logs, 
	BadgePlus 
} from 'lucide-react';
import { NavMain } from '@/components/nav/nav-main';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, useSidebar } from '@/components/ui/sidebar';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslations } from 'next-intl';
import Logo from '../layout/Logo';
// import type { BaseComponentProps } from '@/types';

/**
 * Application sidebar component with navigation and user menu
 *
 * @param props - AppSidebar component props
 * @returns JSX.Element
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const t = useTranslations();
	const { state } = useSidebar();
	const sidebarData = {
		navMain: [
			{
				title: t('sidebar.nav.home'),
				url: 'home',
				icon: House,
			},
			{
				title: t('sidebar.nav.create_transaction'),
				url: 'create-transaction',
				icon: BadgePlus,
			},
			{
				title: t('sidebar.nav.timelock_contracts'),
				url: 'timelocks',
				icon: Clock,
			},
			{
				title: t('sidebar.nav.transactions'),
				url: 'transactions',
				icon: ListTodo,
			},
			{
				title: t('sidebar.nav.transactions_log'),
				url: 'transactions-log',
				icon: Logs,
			},
			{
				title: t('sidebar.nav.abi_library'),
				url: 'abi-lib',
				icon: FileCode,
			},
			{
				title: t('sidebar.nav.notifications'),
				url: 'notify',
				icon: BellDot,
			},
			{
				title: t('sidebar.nav.ecosystem'),
				url: 'ecosystem',
				icon: Box,
			},
		],
		projects: [
			{
				name: t('sidebar.projects.multisig_wallet'),
				url: '#',
				icon: Shield,
			},
			{
				name: t('sidebar.projects.token_vesting'),
				url: '#',
				icon: Clock,
			},
			{
				name: t('sidebar.projects.governance'),
				url: '#',
				icon: Frame,
			},
		],
	};

	return (
		<Sidebar collapsible='icon' {...props}>
			<SidebarHeader className='py-6'>
				<Logo size='sm' color='black' />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={sidebarData.navMain} />
			</SidebarContent>
			<div className='flex flex-col gap-8 justify-center items-center'>
				{state === 'expanded' && <LanguageSwitcher />}
				<SidebarFooter className='w-full flex items-center justify-between px-4 py-2'>
					{/* <a className='' href="">Feedback</a> */}
					{/* <NavUser
						user={{
							name: 'support@timelock.com',
							email: 'support@timelock.com',
							avatar: '/avatars/shadcn.jpg',
						}}
					/> */}
				</SidebarFooter>
			</div>
			<SidebarRail />
		</Sidebar>
	);
}
