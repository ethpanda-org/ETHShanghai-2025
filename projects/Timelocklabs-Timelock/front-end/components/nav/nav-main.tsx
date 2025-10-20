'use client';
import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import type { BaseComponentProps } from '@/types';

interface NavMainItem {
	title: string;
	url: string;
	icon?: LucideIcon;
	isActive?: boolean;
	items?: {
		title: string;
		url: string;
	}[];
}

interface NavMainProps extends BaseComponentProps {
	items: NavMainItem[];
}

/**
 * Main navigation component with collapsible menu items
 *
 * @param props - NavMain component props
 * @returns JSX.Element
 */
export function NavMain({ items, className }: NavMainProps) {
	return (
		<SidebarGroup className={className}>
			<SidebarMenu>
				{items.map(item =>
					item.items ?
						// If item has sub-items, use Collapsible
						<Collapsible key={item.title} asChild defaultOpen={item.isActive} className='group/collapsible'>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton tooltip={item.title}>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
										<ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{item.items?.map(subItem => (
											<SidebarMenuSubItem key={subItem.title}>
												<SidebarMenuSubButton asChild>
													<Link href={`/${subItem.url}`}>
														<span>{subItem.title}</span>
													</Link>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
						// If item has no sub-items, use simple Link
					:	<SidebarMenuItem key={item.title}>
							<SidebarMenuButton tooltip={item.title} asChild>
								<Link href={`/${item.url}`}>
									{item.icon && <item.icon />}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
				)}
			</SidebarMenu>
		</SidebarGroup>
	);
}
