// src/store/zodMiddleware.ts
import { type StateCreator } from 'zustand';
import { type ZodType, ZodError } from 'zod';

/**
 * Zustand middleware for Zod validation.
 * It intercepts `set` calls, validates the new state against the schema,
 * and logs detailed errors to the console if validation fails.
 *
 * @template T The type of the store's state.
 * @param schema The Zod schema to validate the state against.
 * @param config The Zustand state creator function.
 * @returns A new state creator with validation logic.
 */
export const zodMiddleware =
	<T extends object, A extends object>(schema: ZodType<T>, config: StateCreator<T & A, [], []>): StateCreator<T & A, [], []> =>
	(set, get, api) => {
		// 创建一个新的 set 函数，包裹原始的 set
		const newSet: typeof set = (partial, replace) => {
			const oldState = get();
			// Calculate the next complete state
			const nextState = {
				...oldState,
				...(typeof partial === 'function' ? (partial as (state: T & A) => T & A)(oldState) : partial),
			};

			// Validate the new state against the Zod schema
			const result = schema.safeParse(nextState);

			if (!result.success) {
				console.groupCollapsed('%c[Zustand]  Zustand State Validation Failed', 'color: red; font-weight: bold;');
				// console.error('Validation errors:', result.error.flatten());
				console.groupEnd();
				// In development, you might even throw an error to interrupt invalid state updates
				// throw new Error("Zustand state validation failed!");
			}

			// Always call the original set function to update the state, regardless of validation success
			// In production, you might only want to update the state if validation succeeds
			if (replace === true) {
				set(nextState, true);
			} else {
				set(nextState, false);
			}
		};

		return config(newSet, get, api);
	};
