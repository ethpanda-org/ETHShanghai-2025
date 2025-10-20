import React, { useState } from 'react';
import { WalletIcon } from '@heroicons/react/24/outline';
import { useWallet } from '../../hooks/useWallet.js';
import { cn } from '../../utils/cn.js';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  className?: string;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  onConnect,
  className = ''
}) => {
  const { wallet, isConnecting, error, connectWallet, switchChain } = useWallet();
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(true);

  // Check if MetaMask is installed
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMetaMaskInstalled(typeof window.ethereum !== 'undefined');
    }
  }, []);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled) {
      // Open MetaMask installation page
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    await connectWallet('metamask');
    if (wallet) {
      onConnect?.(wallet.address);
    }
  };

  if (wallet) {
    const isLocalhost = wallet.chainId === 31337;

    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <div className="h-2 w-2 bg-green-400 rounded-full" />
        <span className="text-sm text-gray-300">
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </span>
        {!isLocalhost && (
          <button
            onClick={() => switchChain(31337)}
            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
            title="Switch to Localhost 8545"
          >
            Switch to Localhost
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {!isMetaMaskInstalled && (
        <div className="text-sm text-yellow-400 mb-2 p-2 bg-yellow-900/20 rounded border border-yellow-700/30">
          MetaMask not detected. Install MetaMask to connect your wallet.
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        <WalletIcon className="h-5 w-5" />
        <span>
          {isConnecting
            ? 'Connecting...'
            : isMetaMaskInstalled
              ? 'Connect Wallet'
              : 'Install MetaMask'
          }
        </span>
      </button>

      {error && (
        <div className="text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};