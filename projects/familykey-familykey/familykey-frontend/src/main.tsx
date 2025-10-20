import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig, queryClient } from './config/wagmi';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './ui/App';
import './ui/theme.css';
import { I18nProvider } from './ui/i18n';
import { SiweAuthProvider } from './ui/auth/SiweAuthProvider';

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
const privyEnabled = !!privyAppId && privyAppId !== 'demo-app-id';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider defaultLang="en">
      {privyEnabled ? (
        <PrivyProvider
          appId={privyAppId}
          config={{
            loginMethods: ['email', 'sms'],
            embeddedWallets: {
              createOnLogin: 'users-without-wallets',
              requireUserPasswordOnCreate: false,
            },
            appearance: {
              walletList: ['metamask', 'rainbow', 'coinbase_wallet', 'detected_wallets'],
            },
          }}
        >
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <SiweAuthProvider>
                <App />
              </SiweAuthProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </PrivyProvider>
      ) : (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <SiweAuthProvider>
              <App />
            </SiweAuthProvider>
          </QueryClientProvider>
        </WagmiProvider>
      )}
    </I18nProvider>
  </React.StrictMode>
);
