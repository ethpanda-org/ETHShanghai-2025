/**
 * Base form types
 */

import type { z } from 'zod';

/**
 * Form validation error
 */
export interface FormError {
	field: string;
	message: string;
	code?: string;
}

/**
 * Form state
 */
export interface FormState<T = any> {
	values: T;
	errors: Record<string, string>;
	touched: Record<string, boolean>;
	isSubmitting: boolean;
	isValid: boolean;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
	name: string;
	label?: string;
	type?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	validation?: z.ZodSchema;
	help?: string;
}
