'use client';

import { ThirdwebProvider } from 'thirdweb/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

interface Web3ProviderProps {
	children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
	return (
		<ThirdwebProvider>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</ThirdwebProvider>
	);
}
