import {useSystemStore} from "@/stores/systemStore.ts";
// import React from 'react'
import {createRoot} from 'react-dom/client'
import App from './App'
import './index.css'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi'
import i18n from "@/language";
import {BrowserRouter} from 'react-router-dom'
const { language } = useSystemStore.getState();
i18n.changeLanguage(language);
const qc = new QueryClient()

createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
      <BrowserRouter>

    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
      </BrowserRouter>
  /*</React.StrictMode>*/
)
