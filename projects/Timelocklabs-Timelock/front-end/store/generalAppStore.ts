import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
	// Non-persistent state
	isLoading: boolean;
	error: Error | null;

	// Persistent state
	userPreferences: {
		theme: 'light' | 'dark';
	};

	// Actions
	setLoading: (isLoading: boolean) => void;
	setError: (error: Error | null) => void;
	setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>()(
	persist(
		set => ({
			// Non-persistent state
			isLoading: false,
			error: null,

			// Persistent state
			userPreferences: {
				theme: 'light',
			},

			// Actions
			setLoading: isLoading => set({ isLoading }),
			setError: error => set({ error }),
			setTheme: theme =>
				set(state => ({
					userPreferences: { ...state.userPreferences, theme },
				})),
		}),
		{
			name: 'app-storage', // unique name
			storage: createJSONStorage(() => localStorage),
			partialize: state => ({
				userPreferences: state.userPreferences,
			}),
		}
	)
);
