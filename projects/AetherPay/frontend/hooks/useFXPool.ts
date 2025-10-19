import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { CONTRACTS, FX_POOL_ABI, ERC20_ABI } from '@/lib/contracts';
import { TOKEN_INFO } from '@/lib/tokens';

// ============ Types ============
interface PoolInfo {
  totalLiquidity: bigint;
  lpTokenSupply: bigint;
  baseFee: bigint;
  dynamicFee: bigint;
  isActive: boolean;
}

interface UserPosition {
  shares: bigint;
  depositTime: bigint;
  accumulatedFees: bigint;
}

interface SwapQuote {
  amountOut: bigint;
  fee: bigint;
  slippage: bigint;
  executionRate: bigint;
}

interface TokenBalance {
  balance: bigint;
  formatted: string;
  decimals: number;
  symbol: string;
}

// ============ Hooks ============

/**
 * Hook to get pool information
 */
export function usePoolInfo(pair: string) {
  const publicClient = usePublicClient();
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPoolInfo = useCallback(async () => {
    if (!publicClient || !pair) return;

    setLoading(true);
    setError(null);

    try {
      const info = await publicClient.readContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'getPoolInfo',
        args: [pair],
      }) as PoolInfo;

      setPoolInfo(info);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching pool info:', err);
    } finally {
      setLoading(false);
    }
  }, [publicClient, pair]);

  useEffect(() => {
    fetchPoolInfo();
  }, [fetchPoolInfo]);

  return { poolInfo, loading, error, refetch: fetchPoolInfo };
}

/**
 * Hook to get user's liquidity position
 */
export function useUserPosition(pair: string) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosition = useCallback(async () => {
    if (!publicClient || !address || !pair) return;

    setLoading(true);
    setError(null);

    try {
      const userPosition = await publicClient.readContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'getUserPosition',
        args: [pair, address],
      }) as UserPosition;

      setPosition(userPosition);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching user position:', err);
    } finally {
      setLoading(false);
    }
  }, [publicClient, address, pair]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return { position, loading, error, refetch: fetchPosition };
}

/**
 * Hook to get swap quote
 */
export function useSwapQuote(
  pair: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: string
) {
  const publicClient = usePublicClient();
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!publicClient || !pair || !tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) === 0) {
      setQuote(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tokenInInfo = TOKEN_INFO[tokenIn as keyof typeof TOKEN_INFO];
      const tokenOutInfo = TOKEN_INFO[tokenOut as keyof typeof TOKEN_INFO];

      if (!tokenInInfo || !tokenOutInfo) {
        throw new Error('Invalid token');
      }

      const amountInBigInt = parseUnits(amountIn, tokenInInfo.decimals);

      const result = await publicClient.readContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'getQuote',
        args: [
          pair,
          tokenInInfo.address as Address,
          tokenOutInfo.address as Address,
          amountInBigInt,
        ],
      }) as SwapQuote;

      setQuote(result);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching quote:', err);
    } finally {
      setLoading(false);
    }
  }, [publicClient, pair, tokenIn, tokenOut, amountIn]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [fetchQuote]);

  return { quote, loading, error, refetch: fetchQuote };
}

/**
 * Hook to manage liquidity operations
 */
export function useLiquidity(pair: string) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addLiquidity = useCallback(async (
    token: string,
    amount: string
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const tokenInfo = TOKEN_INFO[token as keyof typeof TOKEN_INFO];
      if (!tokenInfo) throw new Error('Invalid token');

      const tokenAddress = tokenInfo.address as Address;
      const amountBigInt = parseUnits(amount, tokenInfo.decimals);

      // Approve token
      const approvalHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.FX_POOL as Address, amountBigInt],
      });

      await publicClient.waitForTransactionReceipt({ hash: approvalHash });

      // Add liquidity
      const hash = await walletClient.writeContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'addLiquidity',
        args: [pair, tokenAddress, amountBigInt],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return { hash, receipt };
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [walletClient, publicClient, address, pair]);

  const removeLiquidity = useCallback(async (
    shares: string,
    token: string
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const tokenInfo = TOKEN_INFO[token as keyof typeof TOKEN_INFO];
      if (!tokenInfo) throw new Error('Invalid token');

      const tokenAddress = tokenInfo.address as Address;
      const sharesBigInt = parseUnits(shares, 18); // LP tokens have 18 decimals

      const hash = await walletClient.writeContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'removeLiquidity',
        args: [pair, sharesBigInt, tokenAddress],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return { hash, receipt };
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [walletClient, publicClient, address, pair]);

  return {
    addLiquidity,
    removeLiquidity,
    loading,
    error,
  };
}

/**
 * Hook to execute swaps
 */
export function useSwap() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeSwap = useCallback(async (
    pair: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippageTolerance: number = 0.5
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const tokenInInfo = TOKEN_INFO[tokenIn as keyof typeof TOKEN_INFO];
      const tokenOutInfo = TOKEN_INFO[tokenOut as keyof typeof TOKEN_INFO];

      if (!tokenInInfo || !tokenOutInfo) {
        throw new Error('Invalid tokens');
      }

      const tokenInAddress = tokenInInfo.address as Address;
      const tokenOutAddress = tokenOutInfo.address as Address;
      const amountInBigInt = parseUnits(amountIn, tokenInInfo.decimals);

      // Get quote first
      const quote = await publicClient.readContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'getQuote',
        args: [pair, tokenInAddress, tokenOutAddress, amountInBigInt],
      }) as SwapQuote;

      // Calculate min amount out with slippage
      const slippageMultiplier = 10000 - Math.floor(slippageTolerance * 100);
      const minAmountOut = (quote.amountOut * BigInt(slippageMultiplier)) / BigInt(10000);

      // Approve token
      const approvalHash = await walletClient.writeContract({
        address: tokenInAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.FX_POOL as Address, amountInBigInt],
      });

      await publicClient.waitForTransactionReceipt({ hash: approvalHash });

      // Execute swap
      const hash = await walletClient.writeContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'swap',
        args: [pair, tokenInAddress, tokenOutAddress, amountInBigInt, minAmountOut],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return { hash, receipt, quote };
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [walletClient, publicClient, address]);

  return {
    executeSwap,
    loading,
    error,
  };
}

/**
 * Hook to get token balance
 */
export function useTokenBalance(token: string) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicClient || !address || !token) return;

    setLoading(true);
    setError(null);

    try {
      const tokenInfo = TOKEN_INFO[token as keyof typeof TOKEN_INFO];
      if (!tokenInfo) throw new Error('Invalid token');

      const tokenAddress = tokenInfo.address as Address;

      const balanceBigInt = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;

      setBalance({
        balance: balanceBigInt,
        formatted: formatUnits(balanceBigInt, tokenInfo.decimals),
        decimals: tokenInfo.decimals,
        symbol: token,
      });
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching balance:', err);
    } finally {
      setLoading(false);
    }
  }, [publicClient, address, token]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
}

/**
 * Hook to track MEV protection status
 */
export function useMEVProtection() {
  const [enabled, setEnabled] = useState(true);
  const [delaySeconds] = useState(2); // 2 seconds delay for MEV protection

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return {
    enabled,
    delaySeconds,
    toggle,
  };
}

/**
 * Hook to check if an order will be split
 */
export function useOrderSplitting(amountIn: string, token: string) {
  const publicClient = usePublicClient();
  const [willSplit, setWillSplit] = useState(false);
  const [threshold, setThreshold] = useState<bigint>(BigInt(0));

  useEffect(() => {
    if (!publicClient) return;

    const checkSplitting = async () => {
      try {
        const splitThreshold = await publicClient.readContract({
          address: CONTRACTS.FX_POOL as Address,
          abi: FX_POOL_ABI,
          functionName: 'orderSplitThreshold',
          args: [],
        }) as bigint;

        setThreshold(splitThreshold);

        if (amountIn && token) {
          const tokenInfo = TOKEN_INFO[token as keyof typeof TOKEN_INFO];
          if (tokenInfo) {
            const amountBigInt = parseUnits(amountIn, tokenInfo.decimals);
            setWillSplit(amountBigInt > splitThreshold);
          }
        }
      } catch (error) {
        console.error('Error checking order splitting:', error);
      }
    };

    checkSplitting();
  }, [publicClient, amountIn, token]);

  return {
    willSplit,
    threshold: formatUnits(threshold, 6), // Assuming threshold is in USDC (6 decimals)
  };
}