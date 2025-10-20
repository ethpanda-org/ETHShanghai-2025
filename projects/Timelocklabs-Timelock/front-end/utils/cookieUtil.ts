/**
 * Cookie utility functions for managing browser cookies
 */

export interface CookieOptions {
	path?: string;
	domain?: string;
	expires?: Date | string;
	maxAge?: number;
	secure?: boolean;
	sameSite?: 'strict' | 'lax' | 'none';
}

export const cookieUtil = {
	/**
	 * Set a cookie with the given name, value, and options
	 */
	set(name: string, value: string, options: CookieOptions = {}): void {
		if (typeof document === 'undefined') return;

		const { path = '/', domain, expires, maxAge, secure, sameSite } = options;

		let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

		if (path) cookieString += `; path=${path}`;
		if (domain) cookieString += `; domain=${domain}`;
		if (expires) {
			const expiresDate = expires instanceof Date ? expires : new Date(expires);
			cookieString += `; expires=${expiresDate.toUTCString()}`;
		}
		if (maxAge !== undefined) cookieString += `; max-age=${maxAge}`;
		if (secure) cookieString += '; secure';
		if (sameSite) cookieString += `; samesite=${sameSite}`;

		document.cookie = cookieString;
	},

	/**
	 * Get a cookie value by name
	 */
	get(name: string): string | null {
		if (typeof document === 'undefined') return null;

		const cookies = document.cookie.split('; ');
		const cookie = cookies.find(row => row.startsWith(`${encodeURIComponent(name)}=`));

		if (!cookie) return null;

		const value = cookie.split('=')[1];
		return value ? decodeURIComponent(value) : null;
	},

	/**
	 * Remove a cookie by setting its expiration date to the past
	 */
	remove(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): void {
		this.set(name, '', {
			...options,
			expires: new Date('Thu, 01 Jan 1970 00:00:00 GMT'),
		});
	},

	/**
	 * Check if a cookie exists
	 */
	exists(name: string): boolean {
		return this.get(name) !== null;
	},

	/**
	 * Get all cookies as an object
	 */
	getAll(): Record<string, string> {
		if (typeof document === 'undefined') return {};

		const cookies: Record<string, string> = {};

		document.cookie.split('; ').forEach(cookie => {
			const [name, value] = cookie.split('=');
			if (name && value) {
				cookies[decodeURIComponent(name)] = decodeURIComponent(value);
			}
		});

		return cookies;
	},
};
