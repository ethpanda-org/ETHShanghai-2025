/**
 * Form-related hook utilities
 * Provides reusable form management patterns
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';
import type { UseFormReturn } from '@/types';

/**
 * Hook for managing form state with validation
 *
 * @param initialValues Initial form values
 * @param validationSchema Optional Zod schema for validation
 * @returns Form state and control methods
 */
export function useForm<T extends Record<string, unknown>>(initialValues: T, validationSchema?: z.ZodSchema<T>): UseFormReturn<T> {
	const [values, setValues] = useState<T>(initialValues);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isValid = Object.keys(errors).length === 0;

	const setValue = useCallback(
		(field: keyof T, value: unknown) => {
			setValues(prev => ({ ...prev, [field]: value }));

			// Clear error when value changes
			if (errors[field as string]) {
				setErrors(prev => {
					const newErrors = { ...prev };
					delete newErrors[field as string];
					return newErrors;
				});
			}
		},
		[errors]
	);

	const setError = useCallback((field: keyof T, error: string) => {
		setErrors(prev => ({ ...prev, [field as string]: error }));
	}, []);

	const clearError = useCallback((field: keyof T) => {
		setErrors(prev => {
			const newErrors = { ...prev };
			delete newErrors[field as string];
			return newErrors;
		});
	}, []);

	const setTouchedField = useCallback((field: keyof T, isTouched = true) => {
		setTouched(prev => ({ ...prev, [field as string]: isTouched }));
	}, []);

	const validate = useCallback((): boolean => {
		if (!validationSchema) return true;

		try {
			validationSchema.parse(values);
			setErrors({});
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const newErrors: Record<string, string> = {};
				error.errors.forEach(err => {
					if (err.path.length > 0) {
						newErrors[err.path[0] as string] = err.message;
					}
				});
				setErrors(newErrors);
			}
			return false;
		}
	}, [values, validationSchema]);

	const handleSubmit = useCallback(
		(onSubmit: (values: T) => void | Promise<void>) => {
			return async (e?: React.FormEvent) => {
				e?.preventDefault();

				setIsSubmitting(true);

				// Mark all fields as touched
				const allTouched = Object.keys(values).reduce(
					(acc, key) => {
						acc[key] = true;
						return acc;
					},
					{} as Record<string, boolean>
				);
				setTouched(allTouched);

				try {
					if (validate()) {
						await onSubmit(values);
					}
				} catch (error) {
					console.error('Form submission error:', error);
				} finally {
					setIsSubmitting(false);
				}
			};
		},
		[values, validate]
	);

	const reset = useCallback(
		(newValues?: Partial<T>) => {
			setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
			setErrors({});
			setTouched({});
			setIsSubmitting(false);
		},
		[initialValues]
	);

	return {
		values,
		errors,
		touched,
		isSubmitting,
		isValid,
		setValue,
		setError,
		clearError,
		setTouched: setTouchedField,
		handleSubmit,
		reset,
		validate,
	};
}

/**
 * Hook for managing field validation
 *
 * @param validationFn Validation function
 * @param dependencies Dependencies that trigger revalidation
 * @returns Field validation utilities
 */
export function useFieldValidation<T>(validationFn: (value: T) => string | null, dependencies: unknown[] = []) {
	const [error, setError] = useState<string | null>(null);
	const [isValidating, setIsValidating] = useState(false);

	const validate = useCallback(
		async (value: T): Promise<boolean> => {
			setIsValidating(true);

			try {
				const errorMessage = validationFn(value);
				setError(errorMessage);
				return errorMessage === null;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Validation failed';
				setError(errorMessage);
				return false;
			} finally {
				setIsValidating(false);
			}
		},
		[validationFn, ...dependencies]
	);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		error,
		isValidating,
		validate,
		clearError,
		hasError: error !== null,
	};
}

/**
 * Hook for managing form arrays (dynamic form fields)
 *
 * @param initialItems Initial array items
 * @param createNewItem Function to create new item
 * @returns Array management utilities
 */
export function useFormArray<T>(initialItems: T[] = [], createNewItem: () => T) {
	const [items, setItems] = useState<T[]>(initialItems);

	const append = useCallback(
		(item?: T) => {
			const newItem = item || createNewItem();
			setItems(prev => [...prev, newItem]);
		},
		[createNewItem]
	);

	const prepend = useCallback(
		(item?: T) => {
			const newItem = item || createNewItem();
			setItems(prev => [newItem, ...prev]);
		},
		[createNewItem]
	);

	const remove = useCallback((index: number) => {
		setItems(prev => prev.filter((_, i) => i !== index));
	}, []);

	const insert = useCallback(
		(index: number, item?: T) => {
			const newItem = item || createNewItem();
			setItems(prev => [...prev.slice(0, index), newItem, ...prev.slice(index)]);
		},
		[createNewItem]
	);

	const update = useCallback((index: number, item: T) => {
		setItems(prev => prev.map((existingItem, i) => (i === index ? item : existingItem)));
	}, []);

	const move = useCallback((fromIndex: number, toIndex: number) => {
		setItems(prev => {
			const newItems = [...prev];
			const movedItem = newItems.splice(fromIndex, 1)[0];
			if (movedItem !== undefined) {
				newItems.splice(toIndex, 0, movedItem);
			}
			return newItems;
		});
	}, []);

	const clear = useCallback(() => {
		setItems([]);
	}, []);

	const reset = useCallback(() => {
		setItems(initialItems);
	}, [initialItems]);

	return {
		items,
		append,
		prepend,
		remove,
		insert,
		update,
		move,
		clear,
		reset,
		length: items.length,
	};
}

/**
 * Hook for managing multi-step forms
 *
 * @param totalSteps Total number of steps
 * @param initialStep Initial step (0-based)
 * @returns Step management utilities
 */
export function useMultiStepForm(totalSteps: number, initialStep = 0) {
	const [currentStep, setCurrentStep] = useState(initialStep);
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
	const [stepData, setStepData] = useState<Record<number, unknown>>({});

	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === totalSteps - 1;
	const canGoNext = currentStep < totalSteps - 1;
	const canGoPrevious = currentStep > 0;

	const goToStep = useCallback(
		(step: number) => {
			if (step >= 0 && step < totalSteps) {
				setCurrentStep(step);
			}
		},
		[totalSteps]
	);

	const nextStep = useCallback(() => {
		if (canGoNext) {
			setCurrentStep(prev => prev + 1);
		}
	}, [canGoNext]);

	const previousStep = useCallback(() => {
		if (canGoPrevious) {
			setCurrentStep(prev => prev - 1);
		}
	}, [canGoPrevious]);

	const markStepCompleted = useCallback((step: number) => {
		setCompletedSteps(prev => new Set([...prev, step]));
	}, []);

	const markStepIncomplete = useCallback((step: number) => {
		setCompletedSteps(prev => {
			const newSet = new Set(prev);
			newSet.delete(step);
			return newSet;
		});
	}, []);

	const setStepDataValue = useCallback((step: number, data: unknown) => {
		setStepData(prev => ({ ...prev, [step]: data }));
	}, []);

	const getStepData = useCallback(
		(step: number) => {
			return stepData[step];
		},
		[stepData]
	);

	const reset = useCallback(() => {
		setCurrentStep(initialStep);
		setCompletedSteps(new Set());
		setStepData({});
	}, [initialStep]);

	const isStepCompleted = useCallback(
		(step: number) => {
			return completedSteps.has(step);
		},
		[completedSteps]
	);

	return {
		currentStep,
		totalSteps,
		isFirstStep,
		isLastStep,
		canGoNext,
		canGoPrevious,
		goToStep,
		nextStep,
		previousStep,
		markStepCompleted,
		markStepIncomplete,
		isStepCompleted,
		setStepData: setStepDataValue,
		getStepData,
		reset,
		progress: ((currentStep + 1) / totalSteps) * 100,
	};
}

/**
 * Hook for managing form persistence to localStorage
 *
 * @param formKey Unique key for the form
 * @param values Current form values
 * @param options Configuration options
 * @returns Persistence utilities
 */
export function useFormPersistence<T extends Record<string, any>>(
	formKey: string,
	values: T,
	options: {
		debounceMs?: number;
		exclude?: (keyof T)[];
		include?: (keyof T)[];
	} = {}
) {
	const { debounceMs = 1000, exclude = [], include } = options;
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	// Save form data to localStorage
	const saveToStorage = useCallback(
		(data: T) => {
			try {
				let dataToSave = { ...data };

				// Filter fields based on include/exclude options
				if (include && include.length > 0) {
					const filteredData = {} as T;
					include.forEach(key => {
						if (key in dataToSave) {
							filteredData[key] = dataToSave[key];
						}
					});
					dataToSave = filteredData;
				} else if (exclude.length > 0) {
					exclude.forEach(key => {
						delete dataToSave[key];
					});
				}

				localStorage.setItem(`form_${formKey}`, JSON.stringify(dataToSave));
			} catch (error) {
				console.warn('Failed to save form data to localStorage:', error);
			}
		},
		[formKey, include, exclude]
	);

	// Load form data from localStorage
	const loadFromStorage = useCallback((): Partial<T> | null => {
		try {
			const saved = localStorage.getItem(`form_${formKey}`);
			return saved ? JSON.parse(saved) : null;
		} catch (error) {
			console.warn('Failed to load form data from localStorage:', error);
			return null;
		}
	}, [formKey]);

	// Clear form data from localStorage
	const clearStorage = useCallback(() => {
		try {
			localStorage.removeItem(`form_${formKey}`);
		} catch (error) {
			console.warn('Failed to clear form data from localStorage:', error);
		}
	}, [formKey]);

	// Debounced save effect
	useEffect(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			saveToStorage(values);
		}, debounceMs);

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [values, saveToStorage, debounceMs]);

	return {
		loadFromStorage,
		clearStorage,
		saveToStorage: () => saveToStorage(values),
	};
}
