import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { config } from './config/wagmi';
import Home from './pages/Home';
import Faucet from './pages/Faucet';
import Markets from './pages/Markets';
import MarketDetail from './pages/MarketDetail';
import CreateBribe from './pages/CreateBribe';
import Staking from './pages/Staking';
import Bribes from './pages/Bribes';
import Delegation from './pages/Delegation';
import PCTFTrading from './pages/PCTFTrading';
import Introduction from './pages/Introduction';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

import '@rainbow-me/rainbowkit/styles.css';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();

  return (
    <div className="app">
      {location.pathname !== '/' && (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-8">
            <h1 className="text-xl font-bold mr-8">🎯 Ponymarket</h1>
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
                Home
              </Link>
              <Link to="/markets" className="text-sm font-medium transition-colors hover:text-primary">
                Markets
              </Link>
              <Link to="/delegation" className="text-sm font-medium transition-colors hover:text-primary">
                Delegation
              </Link>
              <Link to="/pctf-trading" className="text-sm font-medium transition-colors hover:text-primary">
                pCTF Trading
              </Link>
              <Link to="/introduction" className="text-sm font-medium transition-colors hover:text-primary">
                Introduction
              </Link>
              <Link to="/faucet" className="text-sm font-medium transition-colors hover:text-primary">
                Faucet
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-3 text-sm font-medium">
                    V1 <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link to="/v1/staking" className="cursor-pointer">Staking</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/v1/bribes" className="cursor-pointer">Bribes</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="ml-auto">
              <ConnectButton />
            </div>
          </div>
        </nav>
      )}

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/markets/:conditionId" element={<MarketDetail />} />
          <Route path="/bribes/:conditionId" element={<CreateBribe />} />
          <Route path="/delegation" element={<Delegation />} />
          <Route path="/delegation/:conditionId" element={<Delegation />} />
          <Route path="/pctf-trading" element={<PCTFTrading />} />
          <Route path="/introduction" element={<Introduction />} />
          <Route path="/faucet" element={<Faucet />} />

          {/* V1 Routes - Legacy Features */}
          <Route path="/v1/staking" element={<Staking />} />
          <Route path="/v1/bribes" element={<Bribes />} />

          {/* Old routes - redirect to current */}
          <Route path="/staking" element={<Staking />} />
          <Route path="/bribes" element={<Bribes />} />
          <Route path="/pony" element={<Delegation />} />
          <Route path="/v1/pony" element={<Delegation />} />
        </Routes>
      </main>

      {location.pathname !== '/' && (
        <footer className="footer">
          <p>Built for ETHShanghai 2025 🚀</p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
