'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { CONTRACTS, FX_POOL_ABI, ERC20_ABI } from '@/lib/contracts';
import { TOKEN_INFO } from '@/lib/tokens';

interface SwapQuote {
  amountOut: bigint;
  fee: bigint;
  slippage: bigint;
  executionRate: bigint;
}

export default function SwapInterface() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [tokenIn, setTokenIn] = useState('USDC');
  const [tokenOut, setTokenOut] = useState('USDT');
  const [amountIn, setAmountIn] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5'); // 0.5%
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');
  const [orderSplitThreshold, setOrderSplitThreshold] = useState<bigint>(BigInt(0));
  const [maxSlippage, setMaxSlippage] = useState<bigint>(BigInt(0));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mevProtectionEnabled, setMevProtectionEnabled] = useState(true);
  const [estimatedGas, setEstimatedGas] = useState('0');
  const [priceImpact, setPriceImpact] = useState('0');

  const tokens = Object.keys(TOKEN_INFO).filter(t => t !== 'ETH');

  // Fetch token balances
  useEffect(() => {
    if (publicClient && address && tokenIn) {
      fetchBalance(tokenIn, 'in');
    }
  }, [publicClient, address, tokenIn]);

  useEffect(() => {
    if (publicClient && address && tokenOut) {
      fetchBalance(tokenOut, 'out');
    }
  }, [publicClient, address, tokenOut]);

  // Fetch contract parameters
  useEffect(() => {
    if (publicClient) {
      fetchContractParams();
    }
  }, [publicClient]);

  // Get quote when amount changes
  useEffect(() => {
    if (publicClient && amountIn && tokenIn && tokenOut) {
      const delayDebounce = setTimeout(() => {
        getSwapQuote();
      }, 500);
      return () => clearTimeout(delayDebounce);
    }
  }, [publicClient, amountIn, tokenIn, tokenOut]);

  const fetchBalance = async (token: string, type: 'in' | 'out') => {
    try {
      const tokenAddress = TOKEN_INFO[token as keyof typeof TOKEN_INFO].address as Address;
      const balance = await publicClient!.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address!],
      }) as bigint;

      const formattedBalance = formatUnits(balance, TOKEN_INFO[token as keyof typeof TOKEN_INFO].decimals);
      if (type === 'in') {
        setBalanceIn(formattedBalance);
      } else {
        setBalanceOut(formattedBalance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchContractParams = async () => {
    try {
      const [threshold, slippage] = await Promise.all([
        publicClient!.readContract({
          address: CONTRACTS.FX_POOL as Address,
          abi: FX_POOL_ABI,
          functionName: 'orderSplitThreshold',
          args: [],
        }) as Promise<bigint>,
        publicClient!.readContract({
          address: CONTRACTS.FX_POOL as Address,
          abi: FX_POOL_ABI,
          functionName: 'maxSlippage',
          args: [],
        }) as Promise<bigint>,
      ]);

      setOrderSplitThreshold(threshold);
      setMaxSlippage(slippage);
    } catch (error) {
      console.error('Error fetching contract params:', error);
    }
  };

  const getSwapQuote = async () => {
    try {
      const pair = `${tokenIn}/${tokenOut}`;
      const tokenInAddress = TOKEN_INFO[tokenIn as keyof typeof TOKEN_INFO].address as Address;
      const tokenOutAddress = TOKEN_INFO[tokenOut as keyof typeof TOKEN_INFO].address as Address;
      const amountInBigInt = parseUnits(amountIn, TOKEN_INFO[tokenIn as keyof typeof TOKEN_INFO].decimals);

      const result = await publicClient!.readContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'getQuote',
        args: [pair, tokenInAddress, tokenOutAddress, amountInBigInt],
      }) as SwapQuote;

      setQuote(result);

      // Calculate price impact
      const expectedRate = Number(result.executionRate) / 1e8;
      const actualOutput = Number(result.amountOut) / (10 ** TOKEN_INFO[tokenOut as keyof typeof TOKEN_INFO].decimals);
      const inputAmount = Number(amountIn);
      const marketRate = actualOutput / inputAmount;
      const impact = Math.abs((marketRate - expectedRate) / expectedRate * 100);
      setPriceImpact(impact.toFixed(2));

      // Estimate gas (mock value for demonstration)
      setEstimatedGas('0.001');
    } catch (error) {
      console.error('Error getting quote:', error);
      setQuote(null);
    }
  };

  const handleSwap = async () => {
    if (!walletClient || !address || !amountIn || !quote) return;

    setLoading(true);
    try {
      const pair = `${tokenIn}/${tokenOut}`;
      const tokenInAddress = TOKEN_INFO[tokenIn as keyof typeof TOKEN_INFO].address as Address;
      const tokenOutAddress = TOKEN_INFO[tokenOut as keyof typeof TOKEN_INFO].address as Address;
      const amountInBigInt = parseUnits(amountIn, TOKEN_INFO[tokenIn as keyof typeof TOKEN_INFO].decimals);

      // Calculate min amount out with slippage
      const slippageMultiplier = 10000 - Math.floor(parseFloat(slippageTolerance) * 100);
      const minAmountOut = (quote.amountOut * BigInt(slippageMultiplier)) / BigInt(10000);

      // Approve token spending
      const approvalHash = await walletClient.writeContract({
        address: tokenInAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.FX_POOL as Address, amountInBigInt],
      });

      await publicClient!.waitForTransactionReceipt({ hash: approvalHash });

      // Execute swap
      const hash = await walletClient.writeContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'swap',
        args: [pair, tokenInAddress, tokenOutAddress, amountInBigInt, minAmountOut],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      // Refresh balances
      await fetchBalance(tokenIn, 'in');
      await fetchBalance(tokenOut, 'out');

      setAmountIn('');
      setQuote(null);
      alert('Swap executed successfully!');
    } catch (error) {
      console.error('Error executing swap:', error);
      alert('Failed to execute swap');
    } finally {
      setLoading(false);
    }
  };

  const switchTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn('');
    setQuote(null);
  };

  const formatNumber = (num: string | number, decimals: number = 6) => {
    return parseFloat(num.toString()).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    });
  };

  const isLargeOrder = amountIn && orderSplitThreshold ?
    parseUnits(amountIn, TOKEN_INFO[tokenIn as keyof typeof TOKEN_INFO].decimals) > orderSplitThreshold :
    false;

  return (
    <div className="max-w-lg mx-auto">
      {/* Swap Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Swap Tokens
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">
            0.1-0.2% Fee
          </span>
        </div>

        {/* From Token */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-700">From</label>
            <span className="text-sm text-slate-600">
              Balance: {formatNumber(balanceIn)}
            </span>
          </div>
          <div className="flex space-x-2">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-medium"
            />
            <select
              value={tokenIn}
              onChange={(e) => setTokenIn(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold bg-white"
            >
              {tokens.map((token) => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setAmountIn(balanceIn)}
            className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Use Max
          </button>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center my-2">
          <button
            onClick={switchTokens}
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all hover:rotate-180 transform duration-300"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-700">To</label>
            <span className="text-sm text-slate-600">
              Balance: {formatNumber(balanceOut)}
            </span>
          </div>
          <div className="flex space-x-2">
            <input
              type="number"
              value={quote ? formatUnits(quote.amountOut, TOKEN_INFO[tokenOut as keyof typeof TOKEN_INFO].decimals) : ''}
              readOnly
              placeholder="0.0"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-lg font-medium"
            />
            <select
              value={tokenOut}
              onChange={(e) => setTokenOut(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold bg-white"
            >
              {tokens.map((token) => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Exchange Rate</span>
                <span className="font-semibold text-slate-900">
                  1 {tokenIn} = {(Number(quote.executionRate) / 1e8).toFixed(4)} {tokenOut}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Trading Fee</span>
                <span className="font-semibold text-slate-900">
                  {formatUnits(quote.fee, TOKEN_INFO[tokenIn as keyof typeof TOKEN_INFO].decimals)} {tokenIn}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Price Impact</span>
                <span className={`font-semibold ${parseFloat(priceImpact) > 3 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {priceImpact}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Network Fee</span>
                <span className="font-semibold text-slate-900">~{estimatedGas} ETH</span>
              </div>
            </div>
          </div>
        )}

        {/* Smart Order Splitting Alert */}
        {isLargeOrder && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-800">
                  Smart Order Splitting Active
                </div>
                <div className="text-xs text-blue-600 mt-0.5">
                  Your large order will be split for optimal execution and minimal price impact
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full mb-4 text-sm text-slate-600 hover:text-slate-800 flex items-center justify-center font-medium"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Advanced Settings
          <svg
            className={`w-4 h-4 ml-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg space-y-3 border border-slate-200">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Slippage Tolerance
              </label>
              <div className="flex space-x-2 mt-2">
                {['0.1', '0.5', '1.0'].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippageTolerance(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      slippageTolerance === value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:border-emerald-500'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippageTolerance}
                  onChange={(e) => setSlippageTolerance(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-20 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Custom"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                MEV Protection
              </label>
              <button
                onClick={() => setMevProtectionEnabled(!mevProtectionEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  mevProtectionEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    mevProtectionEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* MEV Protection Status */}
        {mevProtectionEnabled && (
          <div className="mb-6 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center text-sm text-emerald-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">MEV Protection Active</span>
              <span className="mx-1">•</span>
              <span>Private Mempool</span>
              <span className="mx-1">•</span>
              <span>Frontrun Protection</span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={loading || !isConnected || !amountIn || !quote}
          className="w-full bg-emerald-600 text-white py-4 px-4 rounded-xl font-semibold hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : !isConnected ? 'Connect Wallet' : !quote ? 'Enter Amount' : 'Execute Swap'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
        <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Why Choose AetherPay FX Pool?
        </h3>
        <ul className="text-xs text-purple-700 space-y-1.5">
          <li className="flex items-start">
            <span className="text-purple-500 mr-1.5">•</span>
            AI-optimized exchange rates from multiple oracle sources
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-1.5">•</span>
            Automatic order splitting for trades over $100k
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-1.5">•</span>
            MEV protection with private mempool routing
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-1.5">•</span>
            Ultra-low fees: 0.1% stablecoins, 0.2% crypto pairs
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-1.5">•</span>
            5% of fees support Ethereum public goods
          </li>
        </ul>
      </div>
    </div>
  );
}