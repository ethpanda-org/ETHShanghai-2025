/**
 * UI state management hook utilities
 * Provides reusable UI interaction patterns
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToggle, useClickOutside } from './useCommonHooks';
import type { VoidCallback, ValueCallback } from '@/types';

/**
 * Hook for managing modal/dialog state
 *
 * @param initialOpen - Initial open state
 * @returns Object with modal state and control methods
 */
export function useModal(initialOpen = false) {
	const [isOpen, toggle, setTrue, setFalse] = useToggle(initialOpen);
	const [data, setData] = useState<any>(null);

	const open = setTrue;
	const close = setFalse;

	const openWithData = useCallback(
		(modalData?: any) => {
			setData(modalData || null);
			open();
		},
		[open]
	);

	const closeAndClear = useCallback(() => {
		close();
		setData(null);
	}, [close]);

	return {
		isOpen,
		data,
		open,
		close,
		toggle,
		openWithData,
		closeAndClear,
	};
}

/**
 * Hook for managing dropdown/popover state with click outside
 *
 * @param initialOpen - Initial open state
 * @returns Object with dropdown state and control methods
 */
export function useDropdown(initialOpen = false) {
	const [isOpen, toggle, setTrue, setFalse] = useToggle(initialOpen);
	const ref = useRef<HTMLDivElement>(null);

	const open = setTrue;
	const close = setFalse;

	useClickOutside(ref, close);

	return {
		isOpen,
		open,
		close,
		toggle,
		ref,
	};
}

/**
 * Hook for managing accordion/collapsible state
 *
 * @param initialExpanded - Initial expanded state
 * @returns Object with accordion state and control methods
 */
export function useAccordion(initialExpanded = false) {
	const [isExpanded, toggle, setTrue, setFalse] = useToggle(initialExpanded);

	const expand = setTrue;
	const collapse = setFalse;

	return {
		isExpanded,
		expand,
		collapse,
		toggle,
	};
}

/**
 * Hook for managing tabs state
 *
 * @param initialTab - Initial active tab
 * @param tabs - Array of tab identifiers
 * @returns Object with tabs state and control methods
 */
export function useTabs<T extends string>(initialTab: T, tabs: T[]) {
	const [activeTab, setActiveTab] = useState<T>(initialTab);

	const isActive = useCallback((tab: T) => activeTab === tab, [activeTab]);

	const setTab = useCallback(
		(tab: T) => {
			if (tabs.includes(tab)) {
				setActiveTab(tab);
			}
		},
		[tabs]
	);

	const nextTab = useCallback(() => {
		const currentIndex = tabs.indexOf(activeTab);
		if (currentIndex !== -1 && tabs.length > 0) {
			const nextIndex = (currentIndex + 1) % tabs.length;
			const nextTab = tabs[nextIndex];
			if (nextTab) {
				setActiveTab(nextTab);
			}
		}
	}, [activeTab, tabs]);

	const prevTab = useCallback(() => {
		const currentIndex = tabs.indexOf(activeTab);
		if (currentIndex !== -1 && tabs.length > 0) {
			const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
			const prevTab = tabs[prevIndex];
			if (prevTab) {
				setActiveTab(prevTab);
			}
		}
	}, [activeTab, tabs]);

	return {
		activeTab,
		setTab,
		isActive,
		nextTab,
		prevTab,
		tabs,
	};
}

/**
 * Hook for managing stepper/wizard state
 *
 * @param totalSteps - Total number of steps
 * @param initialStep - Initial step (0-based)
 * @returns Object with stepper state and control methods
 */
export function useStepper(totalSteps: number, initialStep = 0) {
	const [currentStep, setCurrentStep] = useState(initialStep);
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === totalSteps - 1;
	const progress = ((currentStep + 1) / totalSteps) * 100;

	const goToStep = useCallback(
		(step: number) => {
			if (step >= 0 && step < totalSteps) {
				setCurrentStep(step);
			}
		},
		[totalSteps]
	);

	const nextStep = useCallback(() => {
		if (!isLastStep) {
			setCompletedSteps(prev => new Set([...prev, currentStep]));
			setCurrentStep(prev => prev + 1);
		}
	}, [isLastStep, currentStep]);

	const prevStep = useCallback(() => {
		if (!isFirstStep) {
			setCurrentStep(prev => prev - 1);
		}
	}, [isFirstStep]);

	const markStepCompleted = useCallback((step: number) => {
		setCompletedSteps(prev => new Set([...prev, step]));
	}, []);

	const isStepCompleted = useCallback(
		(step: number) => {
			return completedSteps.has(step);
		},
		[completedSteps]
	);

	const reset = useCallback(() => {
		setCurrentStep(initialStep);
		setCompletedSteps(new Set());
	}, [initialStep]);

	return {
		currentStep,
		totalSteps,
		isFirstStep,
		isLastStep,
		progress,
		completedSteps: Array.from(completedSteps),
		goToStep,
		nextStep,
		prevStep,
		markStepCompleted,
		isStepCompleted,
		reset,
	};
}

/**
 * Hook for managing toast/notification state
 *
 * @returns Object with toast state and control methods
 */
export function useToast() {
	const [toasts, setToasts] = useState<
		Array<{
			id: string;
			message: string;
			type: 'success' | 'error' | 'warning' | 'info';
			duration?: number;
		}>
	>([]);

	const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000) => {
		const id = Math.random().toString(36).substr(2, 9);
		const toast = { id, message, type, duration };

		setToasts(prev => [...prev, toast]);

		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	}, []);

	const removeToast = useCallback((id: string) => {
		setToasts(prev => prev.filter(toast => toast.id !== id));
	}, []);

	const clearToasts = useCallback(() => {
		setToasts([]);
	}, []);

	return {
		toasts,
		addToast,
		removeToast,
		clearToasts,
	};
}

/**
 * Hook for managing loading states with multiple operations
 *
 * @returns Object with loading state and control methods
 */
export function useLoadingStates() {
	const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

	const setLoading = useCallback((key: string, isLoading: boolean) => {
		setLoadingStates(prev => ({
			...prev,
			[key]: isLoading,
		}));
	}, []);

	const isLoading = useCallback(
		(key: string) => {
			return Boolean(loadingStates[key]);
		},
		[loadingStates]
	);

	const isAnyLoading = Object.values(loadingStates).some(Boolean);

	const clearLoading = useCallback((key?: string) => {
		if (key) {
			setLoadingStates(prev => {
				const newState = { ...prev };
				delete newState[key];
				return newState;
			});
		} else {
			setLoadingStates({});
		}
	}, []);

	return {
		loadingStates,
		setLoading,
		isLoading,
		isAnyLoading,
		clearLoading,
	};
}

/**
 * Hook for managing selection state (single or multiple)
 *
 * @param mode - Selection mode ('single' or 'multiple')
 * @param initialSelected - Initial selected items
 * @returns Object with selection state and control methods
 */
export function useSelection<T>(mode: 'single' | 'multiple' = 'single', initialSelected: T[] = []) {
	const [selected, setSelected] = useState<T[]>(initialSelected);

	const isSelected = useCallback(
		(item: T) => {
			return selected.includes(item);
		},
		[selected]
	);

	const select = useCallback(
		(item: T) => {
			setSelected(prev => {
				if (mode === 'single') {
					return [item];
				} else {
					return prev.includes(item) ? prev : [...prev, item];
				}
			});
		},
		[mode]
	);

	const deselect = useCallback((item: T) => {
		setSelected(prev => prev.filter(i => i !== item));
	}, []);

	const toggle = useCallback(
		(item: T) => {
			if (isSelected(item)) {
				deselect(item);
			} else {
				select(item);
			}
		},
		[isSelected, select, deselect]
	);

	const selectAll = useCallback(
		(items: T[]) => {
			if (mode === 'multiple') {
				setSelected(items);
			}
		},
		[mode]
	);

	const deselectAll = useCallback(() => {
		setSelected([]);
	}, []);

	const selectedCount = selected.length;
	const hasSelection = selectedCount > 0;

	return {
		selected,
		selectedCount,
		hasSelection,
		isSelected,
		select,
		deselect,
		toggle,
		selectAll,
		deselectAll,
		clear: deselectAll,
	};
}

/**
 * Hook for managing drag and drop state
 *
 * @returns Object with drag and drop state and control methods
 */
export function useDragAndDrop<T>() {
	const [isDragging, setIsDragging] = useState(false);
	const [draggedItem, setDraggedItem] = useState<T | null>(null);
	const [dropTarget, setDropTarget] = useState<string | null>(null);

	const startDrag = useCallback((item: T) => {
		setIsDragging(true);
		setDraggedItem(item);
	}, []);

	const endDrag = useCallback(() => {
		setIsDragging(false);
		setDraggedItem(null);
		setDropTarget(null);
	}, []);

	const setTarget = useCallback((target: string | null) => {
		setDropTarget(target);
	}, []);

	return {
		isDragging,
		draggedItem,
		dropTarget,
		startDrag,
		endDrag,
		setTarget,
	};
}

/**
 * Hook for managing focus trap (for modals, dropdowns, etc.)
 *
 * @param isActive - Whether focus trap is active
 * @returns Ref to attach to the container element
 */
export function useFocusTrap(isActive: boolean) {
	const containerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		if (!isActive || !containerRef.current) return;

		const container = containerRef.current;
		const focusableElements = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

		const firstElement = focusableElements[0] as HTMLElement;
		const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

		const handleTabKey = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;

			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement?.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement?.focus();
				}
			}
		};

		const handleEscapeKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				// This would typically close the modal/dropdown
				// The parent component should handle this
			}
		};

		// Focus first element when trap becomes active
		firstElement?.focus();

		document.addEventListener('keydown', handleTabKey);
		document.addEventListener('keydown', handleEscapeKey);

		return () => {
			document.removeEventListener('keydown', handleTabKey);
			document.removeEventListener('keydown', handleEscapeKey);
		};
	}, [isActive]);

	return containerRef;
}

/**
 * Hook for managing hover state with delay
 *
 * @param delay - Delay in milliseconds before setting hover state
 * @returns Object with hover state and event handlers
 */
export function useHover(delay = 0) {
	const [isHovered, setIsHovered] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const onMouseEnter = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		if (delay > 0) {
			timeoutRef.current = setTimeout(() => {
				setIsHovered(true);
			}, delay);
		} else {
			setIsHovered(true);
		}
	}, [delay]);

	const onMouseLeave = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		setIsHovered(false);
	}, []);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return {
		isHovered,
		onMouseEnter,
		onMouseLeave,
	};
}
