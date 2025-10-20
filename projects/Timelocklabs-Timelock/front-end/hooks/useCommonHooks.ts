/**
 * Common hook utilities and patterns
 * Re-exports all common hooks from modular files
 */

// Loading and async operations
export { useLoadingState } from './common/useLoadingState';
export { useAsyncOperation } from './common/useAsyncOperation';

// Storage
export { useLocalStorage } from './common/useStorage';

// State utilities
export { useDebounce, usePrevious, useToggle, useCounter, useArray } from './common/useStateUtils';

// Browser utilities
export { useClipboard, useClickOutside, useMediaQuery, useWindowSize, useDocumentTitle } from './common/useBrowserUtils';

// Timers
export { useInterval, useTimeout } from './common/useTimers';
