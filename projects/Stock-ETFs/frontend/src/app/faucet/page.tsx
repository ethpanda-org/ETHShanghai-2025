'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import Link from 'next/link';
import { contractAddresses } from '@/lib/contracts/addresses';
import { useEffect } from 'react';

// Mock ERC20 Faucet ABI
const faucetABI = [
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'canClaim',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'lastClaimTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'faucetCooldown',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'faucetAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getTimeUntilNextClaim',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const erc20ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Helper to get faucet config for current chain
function getFaucetConfig(chainId: number) {
  const config = contractAddresses[chainId as 97 | 56];
  if (!config) return [];

  return [
    {
      name: 'USDT',
      token: config.tokens.usdt,
      faucet: config.faucets.usdt,
    },
  ];
}

interface TokenFaucetProps {
  name: string;
  token: `0x${string}`;
  faucet: `0x${string}`;
  userAddress?: `0x${string}`;
}

function TokenFaucet({ name, token, faucet, userAddress }: TokenFaucetProps) {
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: canClaim, refetch: refetchCanClaim } = useReadContract({
    address: faucet,
    abi: faucetABI,
    functionName: 'canClaim',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: isSuccess ? 2000 : false, // Refetch every 2s after success
    },
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: token,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: isSuccess ? 2000 : false, // Refetch every 2s after success
    },
  });

  const { data: decimals } = useReadContract({
    address: token,
    abi: erc20ABI,
    functionName: 'decimals',
  });

  const { data: faucetAmount } = useReadContract({
    address: faucet,
    abi: faucetABI,
    functionName: 'faucetAmount',
  });

  const { data: cooldownPeriod } = useReadContract({
    address: faucet,
    abi: faucetABI,
    functionName: 'faucetCooldown',
  });

  const { data: timeUntilNextClaim, refetch: refetchTimeUntilNext } = useReadContract({
    address: faucet,
    abi: faucetABI,
    functionName: 'getTimeUntilNextClaim',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 1000, // Refetch every second for countdown
    },
  });

  // Refetch canClaim and balance when transaction is successful
  useEffect(() => {
    if (isSuccess) {
      refetchCanClaim();
      refetchBalance();
      refetchTimeUntilNext();
    }
  }, [isSuccess, refetchCanClaim, refetchBalance, refetchTimeUntilNext]);

  const handleClaim = () => {
    writeContract({
      address: faucet,
      abi: faucetABI,
      functionName: 'claim',
    });
  };

  const formattedBalance = balance && decimals
    ? parseFloat(formatUnits(balance, decimals)).toFixed(4)
    : '0.0000';

  const formattedFaucetAmount = faucetAmount && decimals
    ? parseFloat(formatUnits(faucetAmount, decimals)).toFixed(0)
    : '...';

  // Format time remaining
  const formatTimeRemaining = (seconds: bigint | undefined): string => {
    if (!seconds || seconds === 0n) return '';

    const totalSeconds = Number(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const timeRemainingText = formatTimeRemaining(timeUntilNextClaim);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold">{name}</h3>
          <p className="text-sm text-gray-500">Claim: {formattedFaucetAmount} {name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Your Balance</p>
          <p className="text-lg font-semibold">{formattedBalance}</p>
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={!userAddress || isPending || isConfirming || !canClaim}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {!userAddress
          ? 'Connect Wallet'
          : isPending
          ? 'Confirming...'
          : isConfirming
          ? 'Processing...'
          : !canClaim && timeRemainingText
          ? `Wait ${timeRemainingText}`
          : !canClaim
          ? 'Already Claimed'
          : `Claim ${formattedFaucetAmount} ${name}`}
      </button>

      {hash && (
        <p className="mt-2 text-sm text-green-600 text-center">
          Successfully claimed!{' '}
          <a
            href={`https://testnet.bscscan.com/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-green-700"
          >
            View transaction ↗
          </a>
        </p>
      )}
    </div>
  );
}

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const faucets = getFaucetConfig(chainId);

  // Get cooldown period and faucet amount from the first faucet
  const config = contractAddresses[chainId as 97 | 56];
  const { data: cooldownPeriod } = useReadContract({
    address: config?.faucets.usdt as `0x${string}`,
    abi: faucetABI,
    functionName: 'faucetCooldown',
    query: {
      enabled: !!config,
    },
  });

  const { data: faucetAmount } = useReadContract({
    address: config?.faucets.usdt as `0x${string}`,
    abi: faucetABI,
    functionName: 'faucetAmount',
    query: {
      enabled: !!config,
    },
  });

  const { data: decimals } = useReadContract({
    address: config?.tokens.usdt as `0x${string}`,
    abi: erc20ABI,
    functionName: 'decimals',
    query: {
      enabled: !!config,
    },
  });

  const formattedFaucetAmount = faucetAmount && decimals
    ? parseFloat(formatUnits(faucetAmount, decimals)).toFixed(0)
    : '500';

  const formatCooldownPeriod = (seconds: bigint | undefined): string => {
    if (!seconds) return 'loading...';
    const totalSeconds = Number(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${totalSeconds} second${totalSeconds > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">B</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">BlockETF</h1>
              </Link>
              <nav className="flex space-x-4">
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Home
                </Link>
                <Link
                  href="/faucet"
                  className="text-blue-600 font-medium"
                >
                  Faucet
                </Link>
              </nav>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">USDT Faucet 💧</h2>
          <p className="text-gray-600">
            Claim test USDT to invest in BlockETF on BSC Testnet. Can be claimed once every {formatCooldownPeriod(cooldownPeriod)}.
          </p>
        </div>

        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <p className="text-yellow-800 font-medium text-center">
              👆 Please connect your wallet to claim test tokens
            </p>
          </div>
        )}

        <div className="max-w-md mx-auto">
          {faucets.map((faucet) => (
            <TokenFaucet
              key={faucet.name}
              name={faucet.name}
              token={faucet.token as `0x${string}`}
              faucet={faucet.faucet as `0x${string}`}
              userAddress={address}
            />
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">How to Use</h3>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                1
              </span>
              <span>Connect your wallet to BSC Testnet (ChainID: 97)</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                2
              </span>
              <span>
                Get some test BNB from{' '}
                <a
                  href="https://testnet.bnbchain.org/faucet-smart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  BNB Faucet
                </a>
                {' '}for gas fees
              </span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                3
              </span>
              <span>Claim {formattedFaucetAmount} test USDT from the faucet above</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                4
              </span>
              <span>
                Go back to{' '}
                <Link href="/" className="text-blue-600 hover:underline">
                  Home
                </Link>
                {' '}and start investing in BlockETF!
              </span>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            ⚠️ These are testnet tokens with no real value. For testing purposes only.
          </p>
        </footer>
      </main>
    </div>
  );
}
