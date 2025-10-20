import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const formatTimeRemaining = (seconds: number) => {
	if (seconds <= 0) return 'Ready';

	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days > 0) {
		return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
	}
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
};

export const formatAddress = (address: string) => {
	if (!address) return '';
	return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

// export const formatDate = (dateString: string) => {
// 	try {
// 		const date = new Date(dateString);
// 		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 		const month = months[date.getMonth()];
// 		const day = date.getDate();
// 		const hours = date.getHours().toString().padStart(2, '0');
// 		const minutes = date.getMinutes().toString().padStart(2, '0');

// 		return `${month} ${day}, ${hours}:${minutes}`;
// 	} catch (error) {
// 		console.error('Error formatting date:', error);
// 		return dateString;
// 	}
// };

export const formatDate = (dateString: string) => {
	try {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');

		return `${month}/${day} ${hours}:${minutes}`;
	} catch (error) {
		console.error('Error formatting date:', error);
		return dateString;
	}
};

export const formatDateWithYear = (dateString: string) => {
	try {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');

		return `${year}/${month}/${day} ${hours}:${minutes}`;
	} catch (error) {
		console.error('Error formatting date:', error);
		return dateString;
	}
};

// export const formatDateWithYear = (dateString: string) => {
// 	try {
// 		const date = new Date(dateString);
// 		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 		const month = months[date.getMonth()];
// 		const day = date.getDate();
// 		const hours = date.getHours().toString().padStart(2, '0');
// 		const minutes = date.getMinutes().toString().padStart(2, '0');
// 		const year = date.getFullYear();

// 		return `${month} ${day}, ${year} ${hours}:${minutes}`;
// 	} catch (error) {
// 		console.error('Error formatting date:', error);
// 		return dateString;
// 	}
// };