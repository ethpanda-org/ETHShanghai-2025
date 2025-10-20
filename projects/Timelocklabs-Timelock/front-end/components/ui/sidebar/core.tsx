'use client';

import * as React from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSidebar } from './context';
import { SIDEBAR_WIDTH_MOBILE } from './constants';

export function Sidebar({
	side = 'left',
	variant = 'sidebar',
	collapsible = 'offcanvas',
	className,
	children,
	...props
}: React.ComponentProps<'div'> & {
	side?: 'left' | 'right';
	variant?: 'sidebar' | 'floating' | 'inset';
	collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

	if (collapsible === 'none') {
		return (
			<div data-slot='sidebar' className={cn('bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col', className)} {...props}>
				{children}
			</div>
		);
	}

	if (isMobile) {
		return (
			<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
				<SheetContent
					data-sidebar='sidebar'
					data-slot='sidebar'
					data-mobile='true'
					className='bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden'
					style={
						{
							'--sidebar-width': SIDEBAR_WIDTH_MOBILE,
						} as React.CSSProperties
					}
					side={side}>
					<SheetHeader className='sr-only'>
						<SheetTitle>Sidebar</SheetTitle>
						<SheetDescription>Displays the mobile sidebar.</SheetDescription>
					</SheetHeader>
					<div className='flex h-full w-full flex-col'>{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div
			className='group peer text-sidebar-foreground hidden md:block'
			data-state={state}
			data-collapsible={state === 'collapsed' ? collapsible : ''}
			data-variant={variant}
			data-side={side}
			data-slot='sidebar'>
			{/* This is what handles the sidebar gap on desktop */}
			<div
				data-slot='sidebar-gap'
				className={cn(
					'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
					'group-data-[collapsible=offcanvas]:w-0',
					'group-data-[side=right]:rotate-180',
					variant === 'floating' || variant === 'inset' ?
						'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
					:	'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
				)}
			/>
			<div
				data-slot='sidebar-container'
				className={cn(
					'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
					side === 'left' ?
						'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
					:	'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
					// Adjust the padding for floating and inset variants.
					variant === 'floating' || variant === 'inset' ?
						'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
					:	'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
					className
				)}
				{...props}>
				<div
					data-sidebar='sidebar'
					data-slot='sidebar-inner'
					className='bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border'>
					{children}
				</div>
			</div>
		</div>
	);
}

export function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
	const { toggleSidebar } = useSidebar();

	return (
		<Button
			data-sidebar='trigger'
			data-slot='sidebar-trigger'
			variant='ghost'
			size='icon'
			className={cn('size-7', className)}
			onClick={event => {
				onClick?.(event);
				toggleSidebar();
			}}
			{...props}>
			<PanelLeftIcon />
			<span className='sr-only'>Toggle Sidebar</span>
		</Button>
	);
}

export function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
	const { toggleSidebar } = useSidebar();

	return (
		<button
			data-sidebar='rail'
			data-slot='sidebar-rail'
			aria-label='Toggle Sidebar'
			tabIndex={-1}
			onClick={toggleSidebar}
			title='Toggle Sidebar'
			className={cn(
				'hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex',
				'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
				'[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
				'hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
				'[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
				'[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
				className
			)}
			{...props}
		/>
	);
}

export function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
	return (
		<main
			data-slot='sidebar-inset'
			className={cn(
				'bg-background relative flex w-full flex-1 flex-col',
				'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
				className
			)}
			{...props}
		/>
	);
}

export function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
	return <Input data-slot='sidebar-input' data-sidebar='input' className={cn('bg-background h-8 w-full', className)} {...props} />;
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot='sidebar-header' data-sidebar='header' className={cn('flex flex-col gap-2 p-4', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot='sidebar-footer' data-sidebar='footer' className={cn('flex flex-col gap-2 p-2 border-t border-sidebar-border h-[72px]', className)} {...props} />;
}

export function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
	return <Separator data-slot='sidebar-separator' data-sidebar='separator' className={cn('bg-sidebar-border mx-2 w-auto', className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='sidebar-content'
			data-sidebar='content'
			className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden', className)}
			{...props}
		/>
	);
}
