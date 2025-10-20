/**
 * Validation utilities for hooks
 * Provides reusable validation patterns and utilities
 */

'use client';

import { useCallback, useMemo } from 'react';
import { z } from 'zod';
import { ethers } from 'ethers';

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
	email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	url: /^https?:\/\/.+/,
	ethereum: {
		address: /^0x[a-fA-F0-9]{40}$/,
		hash: /^0x[a-fA-F0-9]{64}$/,
		privateKey: /^0x[a-fA-F0-9]{64}$/,
	},
	password: {
		strong: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
		medium: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
	},
	phone: /^\+?[\d\s\-\(\)]+$/,
	alphanumeric: /^[a-zA-Z0-9]+$/,
	slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

/**
 * Common validation error messages
 */
export const ValidationMessages = {
	required: (field: string) => `${field} is required`,
	invalid: (field: string) => `${field} is invalid`,
	tooShort: (field: string, min: number) => `${field} must be at least ${min} characters`,
	tooLong: (field: string, max: number) => `${field} must be no more than ${max} characters`,
	email: 'Please enter a valid email address',
	url: 'Please enter a valid URL',
	ethereum: {
		address: 'Please enter a valid Ethereum address',
		hash: 'Please enter a valid transaction hash',
		privateKey: 'Please enter a valid private key',
	},
	password: {
		weak: 'Password is too weak',
		strong: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character',
		medium: 'Password must contain at least 6 characters with letters and numbers',
	},
	phone: 'Please enter a valid phone number',
	numeric: 'Please enter a valid number',
	positive: 'Value must be positive',
	range: (min: number, max: number) => `Value must be between ${min} and ${max}`,
} as const;

/**
 * Hook for creating validation functions
 */
export function useValidation() {
	// Basic validators
	const isRequired = useCallback((value: unknown): boolean => {
		if (value === null || value === undefined) return false;
		if (typeof value === 'string') return value.trim().length > 0;
		if (Array.isArray(value)) return value.length > 0;
		return true;
	}, []);

	const isEmail = useCallback((value: string): boolean => {
		return ValidationPatterns.email.test(value);
	}, []);

	const isUrl = useCallback((value: string): boolean => {
		return ValidationPatterns.url.test(value);
	}, []);

	const isEthereumAddress = useCallback((value: string): boolean => {
		return ethers.utils.isAddress(value);
	}, []);

	const isEthereumHash = useCallback((value: string): boolean => {
		return ValidationPatterns.ethereum.hash.test(value);
	}, []);

	const isStrongPassword = useCallback((value: string): boolean => {
		return ValidationPatterns.password.strong.test(value);
	}, []);

	const isMediumPassword = useCallback((value: string): boolean => {
		return ValidationPatterns.password.medium.test(value);
	}, []);

	const isPhone = useCallback((value: string): boolean => {
		return ValidationPatterns.phone.test(value);
	}, []);

	const isNumeric = useCallback((value: string): boolean => {
		return !isNaN(Number(value)) && !isNaN(parseFloat(value));
	}, []);

	const isPositive = useCallback((value: number): boolean => {
		return value > 0;
	}, []);

	const isInRange = useCallback((value: number, min: number, max: number): boolean => {
		return value >= min && value <= max;
	}, []);

	const hasMinLength = useCallback((value: string, min: number): boolean => {
		return value.length >= min;
	}, []);

	const hasMaxLength = useCallback((value: string, max: number): boolean => {
		return value.length <= max;
	}, []);

	// Composite validators
	const validateField = useCallback(
		(
			value: unknown,
			rules: {
				required?: boolean;
				email?: boolean;
				url?: boolean;
				ethereumAddress?: boolean;
				ethereumHash?: boolean;
				strongPassword?: boolean;
				mediumPassword?: boolean;
				phone?: boolean;
				numeric?: boolean;
				positive?: boolean;
				minLength?: number;
				maxLength?: number;
				min?: number;
				max?: number;
				pattern?: RegExp;
				custom?: (value: unknown) => boolean | string;
			}
		): string | null => {
			const stringValue = String(value || '');
			const numericValue = Number(value);

			// Required check
			if (rules.required && !isRequired(value)) {
				return ValidationMessages.required('Field');
			}

			// Skip other validations if value is empty and not required
			if (!isRequired(value) && !rules.required) {
				return null;
			}

			// Email validation
			if (rules.email && !isEmail(stringValue)) {
				return ValidationMessages.email;
			}

			// URL validation
			if (rules.url && !isUrl(stringValue)) {
				return ValidationMessages.url;
			}

			// Ethereum address validation
			if (rules.ethereumAddress && !isEthereumAddress(stringValue)) {
				return ValidationMessages.ethereum.address;
			}

			// Ethereum hash validation
			if (rules.ethereumHash && !isEthereumHash(stringValue)) {
				return ValidationMessages.ethereum.hash;
			}

			// Password strength validation
			if (rules.strongPassword && !isStrongPassword(stringValue)) {
				return ValidationMessages.password.strong;
			}

			if (rules.mediumPassword && !isMediumPassword(stringValue)) {
				return ValidationMessages.password.medium;
			}

			// Phone validation
			if (rules.phone && !isPhone(stringValue)) {
				return ValidationMessages.phone;
			}

			// Numeric validation
			if (rules.numeric && !isNumeric(stringValue)) {
				return ValidationMessages.numeric;
			}

			// Positive number validation
			if (rules.positive && !isPositive(numericValue)) {
				return ValidationMessages.positive;
			}

			// Length validations
			if (rules.minLength && !hasMinLength(stringValue, rules.minLength)) {
				return ValidationMessages.tooShort('Field', rules.minLength);
			}

			if (rules.maxLength && !hasMaxLength(stringValue, rules.maxLength)) {
				return ValidationMessages.tooLong('Field', rules.maxLength);
			}

			// Range validations
			if (rules.min !== undefined && numericValue < rules.min) {
				return `Value must be at least ${rules.min}`;
			}

			if (rules.max !== undefined && numericValue > rules.max) {
				return `Value must be no more than ${rules.max}`;
			}

			if (rules.min !== undefined && rules.max !== undefined) {
				if (!isInRange(numericValue, rules.min, rules.max)) {
					return ValidationMessages.range(rules.min, rules.max);
				}
			}

			// Pattern validation
			if (rules.pattern && !rules.pattern.test(stringValue)) {
				return ValidationMessages.invalid('Field');
			}

			// Custom validation
			if (rules.custom) {
				const result = rules.custom(value);
				if (typeof result === 'string') {
					return result;
				}
				if (result === false) {
					return ValidationMessages.invalid('Field');
				}
			}

			return null;
		},
		[isRequired, isEmail, isUrl, isEthereumAddress, isEthereumHash, isStrongPassword, isMediumPassword, isPhone, isNumeric, isPositive, isInRange, hasMinLength, hasMaxLength]
	);

	return {
		// Basic validators
		isRequired,
		isEmail,
		isUrl,
		isEthereumAddress,
		isEthereumHash,
		isStrongPassword,
		isMediumPassword,
		isPhone,
		isNumeric,
		isPositive,
		isInRange,
		hasMinLength,
		hasMaxLength,

		// Composite validator
		validateField,
	};
}

/**
 * Hook for creating Zod schemas with common patterns
 */
export function useZodSchemas() {
	const schemas = useMemo(
		() => ({
			email: z.string().email(ValidationMessages.email),

			url: z.string().url(ValidationMessages.url),

			ethereumAddress: z.string().refine(value => ethers.utils.isAddress(value), ValidationMessages.ethereum.address),

			ethereumHash: z.string().refine(value => ValidationPatterns.ethereum.hash.test(value), ValidationMessages.ethereum.hash),

			strongPassword: z.string().refine(value => ValidationPatterns.password.strong.test(value), ValidationMessages.password.strong),

			mediumPassword: z.string().refine(value => ValidationPatterns.password.medium.test(value), ValidationMessages.password.medium),

			phone: z.string().refine(value => ValidationPatterns.phone.test(value), ValidationMessages.phone),

			positiveNumber: z.number().positive(ValidationMessages.positive),

			nonEmptyString: z.string().min(1, ValidationMessages.required('Field')),

			slug: z.string().refine(value => ValidationPatterns.slug.test(value), 'Must be a valid slug (lowercase letters, numbers, and hyphens only)'),

			alphanumeric: z.string().refine(value => ValidationPatterns.alphanumeric.test(value), 'Must contain only letters and numbers'),
		}),
		[]
	);

	const createStringSchema = useCallback(
		(
			options: {
				required?: boolean;
				minLength?: number;
				maxLength?: number;
				pattern?: RegExp;
				patternMessage?: string;
			} = {}
		) => {
			if (options.required) {
				let schema = z.string().min(1, ValidationMessages.required('Field'));

				if (options.minLength) {
					schema = schema.min(options.minLength, ValidationMessages.tooShort('Field', options.minLength));
				}

				if (options.maxLength) {
					schema = schema.max(options.maxLength, ValidationMessages.tooLong('Field', options.maxLength));
				}

				if (options.pattern) {
					return schema.refine(value => !value || options.pattern!.test(value), options.patternMessage || ValidationMessages.invalid('Field'));
				}

				return schema;
			} else {
				let baseSchema = z.string();

				if (options.minLength) {
					baseSchema = baseSchema.min(options.minLength, ValidationMessages.tooShort('Field', options.minLength));
				}

				if (options.maxLength) {
					baseSchema = baseSchema.max(options.maxLength, ValidationMessages.tooLong('Field', options.maxLength));
				}

				if (options.pattern) {
					return baseSchema.refine(value => !value || options.pattern!.test(value), options.patternMessage || ValidationMessages.invalid('Field')).optional();
				}

				return baseSchema.optional();
			}
		},
		[]
	);

	const createNumberSchema = useCallback(
		(
			options: {
				required?: boolean;
				min?: number;
				max?: number;
				positive?: boolean;
				integer?: boolean;
			} = {}
		) => {
			if (options.required) {
				let schema = z.number();

				if (options.min !== undefined) {
					schema = schema.min(options.min, `Value must be at least ${options.min}`);
				}

				if (options.max !== undefined) {
					schema = schema.max(options.max, `Value must be no more than ${options.max}`);
				}

				if (options.positive) {
					schema = schema.positive(ValidationMessages.positive);
				}

				if (options.integer) {
					schema = schema.int('Value must be an integer');
				}

				return schema;
			} else {
				let baseSchema = z.number();

				if (options.min !== undefined) {
					baseSchema = baseSchema.min(options.min, `Value must be at least ${options.min}`);
				}

				if (options.max !== undefined) {
					baseSchema = baseSchema.max(options.max, `Value must be no more than ${options.max}`);
				}

				if (options.positive) {
					baseSchema = baseSchema.positive(ValidationMessages.positive);
				}

				if (options.integer) {
					baseSchema = baseSchema.int('Value must be an integer');
				}

				return baseSchema.optional();
			}
		},
		[]
	);

	return {
		schemas,
		createStringSchema,
		createNumberSchema,
	};
}

/**
 * Hook for async validation
 */
export function useAsyncValidation() {
	const validateAsync = useCallback(async <T>(value: T, validator: (value: T) => Promise<boolean | string>): Promise<string | null> => {
		try {
			const result = await validator(value);

			if (typeof result === 'string') {
				return result;
			}

			return result ? null : ValidationMessages.invalid('Field');
		} catch (error) {
			return error instanceof Error ? error.message : 'Validation failed';
		}
	}, []);

	const createAsyncValidator = useCallback(
		<T>(validator: (value: T) => Promise<boolean | string>, debounceMs = 300) => {
			let timeoutId: NodeJS.Timeout;

			return (value: T): Promise<string | null> => {
				return new Promise(resolve => {
					clearTimeout(timeoutId);

					timeoutId = setTimeout(async () => {
						const result = await validateAsync(value, validator);
						resolve(result);
					}, debounceMs);
				});
			};
		},
		[validateAsync]
	);

	return {
		validateAsync,
		createAsyncValidator,
	};
}
