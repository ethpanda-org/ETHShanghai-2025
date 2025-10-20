/**
 * UI component prop types
 */

/**
 * Button component variants
 */
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

/**
 * Button component sizes
 */
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

/**
 * Button component props
 */
export interface ButtonProps extends React.ComponentProps<'button'> {
	className?: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
	asChild?: boolean;
}

/**
 * Input component props
 */
export interface InputProps extends React.ComponentProps<'input'> {
	className?: string;
}

/**
 * Card component props
 */
export interface CardProps extends React.ComponentProps<'div'> {
	className?: string;
}

export interface SidebarContextProps {
	state: 'expanded' | 'collapsed';
	open: boolean;
	setOpen: (open: boolean) => void;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	isMobile: boolean;
	toggleSidebar: () => void;
};
