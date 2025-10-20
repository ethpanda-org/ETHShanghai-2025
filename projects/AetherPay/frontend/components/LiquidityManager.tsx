'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { CONTRACTS, FX_POOL_ABI, ERC20_ABI } from '@/lib/contracts';
import { TOKEN_INFO } from '@/lib/tokens';

interface UserPosition {
  shares: bigint;
  depositTime: bigint;
  accumulatedFees: bigint;
}

interface PoolInfo {
  totalLiquidity: bigint;
  lpTokenSupply: bigint;
  baseFee: bigint;
  dynamicFee: bigint;
  isActive: boolean;
}

export default function LiquidityManager() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [selectedPair, setSelectedPair] = useState('USDC/USDT');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [removeShares, setRemoveShares] = useState('');
  const [loading, setLoading] = useState(false);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [estimatedShares, setEstimatedShares] = useState('0');
  const [estimatedReturn, setEstimatedReturn] = useState('0');

  const pairs = [
    'USDC/USDT',
    'ETH/USDC',
    'ETH/USDT',
    'WBTC/USDC',
    'DAI/USDC',
    'SOL/USDT',
  ];

  const getTokensForPair = (pair: string) => {
    const [token1, token2] = pair.split('/');
    return [token1, token2];
  };

  // Fetch user position
  useEffect(() => {
    if (publicClient && address && selectedPair) {
      fetchUserPosition();
      fetchPoolInfo();
    }
  }, [publicClient, address, selectedPair]);

  // Fetch token balance
  useEffect(() => {
    if (publicClient && address && selectedToken) {
      fetchTokenBalance();
    }
  }, [publicClient, address, selectedToken]);

  // Calculate estimated shares/returns
  useEffect(() => {
    if (amount && poolInfo) {
      if (activeTab === 'add') {
        calculateEstimatedShares();
      }
    }
  }, [amount, poolInfo, activeTab]);

  useEffect(() => {
    if (removeShares && poolInfo && userPosition) {
      calculateEstimatedReturn();
    }
  }, [removeShares, poolInfo, userPosition]);

  const fetchUserPosition = async () => {
    try {
      const position = await publicClient!.readContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'getUserPosition',
        args: [selectedPair, address!],
      }) as UserPosition;
      setUserPosition(position);
    } catch (error) {
      console.error('Error fetching user position:', error);
      setUserPosition(null);
    }
  };

  const fetchPoolInfo = async () => {
    try {
      const info = await publicClient!.readContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'getPoolInfo',
        args: [selectedPair],
      }) as PoolInfo;
      setPoolInfo(info);
    } catch (error) {
      console.error('Error fetching pool info:', error);
      setPoolInfo(null);
    }
  };

  const fetchTokenBalance = async () => {
    try {
      const tokenAddress = TOKEN_INFO[selectedToken as keyof typeof TOKEN_INFO]?.address as Address;
      if (!tokenAddress) return;

      const balance = await publicClient!.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address!],
      }) as bigint;

      const decimals = TOKEN_INFO[selectedToken as keyof typeof TOKEN_INFO]?.decimals || 18;
      setTokenBalance(formatUnits(balance, decimals));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setTokenBalance('0');
    }
  };

  const calculateEstimatedShares = () => {
    if (!poolInfo || !amount) return;

    try {
      const tokenInfo = TOKEN_INFO[selectedToken as keyof typeof TOKEN_INFO];
      if (!tokenInfo) return;

      const tokenDecimals = tokenInfo.decimals;
      const amountBigInt = parseUnits(amount, tokenDecimals);

      if (poolInfo.totalLiquidity > 0) {
        const shares = (amountBigInt * poolInfo.lpTokenSupply) / poolInfo.totalLiquidity;
        setEstimatedShares(formatUnits(shares, 18));
      } else {
        setEstimatedShares(amount);
      }
    } catch (error) {
      console.error('Error calculating shares:', error);
      setEstimatedShares('0');
    }
  };

  const calculateEstimatedReturn = () => {
    if (!poolInfo || !removeShares || !userPosition) return;

    try {
      const sharesBigInt = parseUnits(removeShares, 18);

      if (poolInfo.lpTokenSupply > 0) {
        const returnAmount = (sharesBigInt * poolInfo.totalLiquidity) / poolInfo.lpTokenSupply;
        setEstimatedReturn(formatUnits(returnAmount, 6));
      } else {
        setEstimatedReturn('0');
      }
    } catch (error) {
      console.error('Error calculating return:', error);
      setEstimatedReturn('0');
    }
  };

  const handleAddLiquidity = async () => {
    if (!walletClient || !address || !amount) return;

    setLoading(true);
    try {
      const tokenInfo = TOKEN_INFO[selectedToken as keyof typeof TOKEN_INFO];
      if (!tokenInfo) {
        alert('Invalid token selected');
        return;
      }

      const tokenAddress = tokenInfo.address as Address;
      const tokenDecimals = tokenInfo.decimals;
      const amountBigInt = parseUnits(amount, tokenDecimals);

      // Approve token
      const approvalHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.FX_POOL as Address, amountBigInt],
      });

      await publicClient!.waitForTransactionReceipt({ hash: approvalHash });

      // Add liquidity
      const hash = await walletClient.writeContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'addLiquidity',
        args: [selectedPair, tokenAddress, amountBigInt],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      // Refresh data
      await fetchUserPosition();
      await fetchPoolInfo();
      await fetchTokenBalance();

      setAmount('');
      alert('Liquidity added successfully!');
    } catch (error) {
      console.error('Error adding liquidity:', error);
      alert('Failed to add liquidity');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!walletClient || !address || !removeShares) return;

    setLoading(true);
    try {
      const tokenInfo = TOKEN_INFO[selectedToken as keyof typeof TOKEN_INFO];
      if (!tokenInfo) {
        alert('Invalid token selected');
        return;
      }

      const tokenAddress = tokenInfo.address as Address;
      const sharesBigInt = parseUnits(removeShares, 18);

      const hash = await walletClient.writeContract({
        address: CONTRACTS.FX_POOL as Address,
        abi: FX_POOL_ABI,
        functionName: 'removeLiquidity',
        args: [selectedPair, sharesBigInt, tokenAddress],
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      // Refresh data
      await fetchUserPosition();
      await fetchPoolInfo();
      await fetchTokenBalance();

      setRemoveShares('');
      alert('Liquidity removed successfully!');
    } catch (error) {
      console.error('Error removing liquidity:', error);
      alert('Failed to remove liquidity');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: string | number | bigint, decimals: number = 6) => {
    try {
      const value = typeof num === 'bigint' ? formatUnits(num, decimals) : num.toString();
      return parseFloat(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: decimals
      });
    } catch {
      return '0.00';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Liquidity Management</h2>
        <p className="text-slate-600">Add liquidity to earn trading fees from every swap</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
        {/* Tab Navigation */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-3 px-1 font-medium transition-all border-b-2 ${
                activeTab === 'add'
                  ? 'text-emerald-600 border-emerald-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Add Liquidity
            </button>
            <button
              onClick={() => setActiveTab('remove')}
              className={`pb-3 px-1 font-medium transition-all border-b-2 ${
                activeTab === 'remove'
                  ? 'text-emerald-600 border-emerald-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Remove Liquidity
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Pool Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Pool
            </label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              {pairs.map((pair) => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>

          {/* Pool Info */}
          {poolInfo && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Pool Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Total Liquidity</span>
                  <p className="font-semibold text-slate-900">
                    ${formatNumber(poolInfo.totalLiquidity, 6)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">LP Token Supply</span>
                  <p className="font-semibold text-slate-900">
                    {formatNumber(poolInfo.lpTokenSupply, 18)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Base Fee</span>
                  <p className="font-semibold text-slate-900">
                    {poolInfo.baseFee ? (Number(poolInfo.baseFee) / 100).toFixed(2) : '0.00'}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Status</span>
                  <p className={`font-semibold ${poolInfo.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {poolInfo.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User Position */}
          {userPosition && userPosition.shares > 0 && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <h3 className="text-sm font-semibold text-emerald-900 mb-3">Your Position</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-700">LP Tokens</span>
                  <span className="font-semibold text-emerald-900">
                    {formatNumber(userPosition.shares, 18)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Accumulated Fees</span>
                  <span className="font-semibold text-emerald-900">
                    ${formatNumber(userPosition.accumulatedFees, 6)}
                  </span>
                </div>
                {poolInfo && poolInfo.lpTokenSupply > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Pool Share</span>
                    <span className="font-semibold text-emerald-900">
                      {((Number(userPosition.shares) / Number(poolInfo.lpTokenSupply)) * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Liquidity Form */}
          {activeTab === 'add' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Token
                </label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  {getTokensForPair(selectedPair).map((token) => (
                    <option key={token} value={token}>{token}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-700">Amount</label>
                  <span className="text-sm text-slate-600">
                    Balance: {formatNumber(tokenBalance)} {selectedToken}
                  </span>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                />
                <button
                  onClick={() => setAmount(tokenBalance)}
                  className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Use Max
                </button>
              </div>

              {amount && estimatedShares && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-sm">
                    <div className="flex justify-between text-blue-700">
                      <span>Estimated LP Tokens</span>
                      <span className="font-semibold">{formatNumber(estimatedShares, 4)}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddLiquidity}
                disabled={loading || !isConnected || !amount || parseFloat(amount) === 0}
                className="w-full bg-emerald-600 text-white py-4 px-4 rounded-xl font-semibold hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {loading ? 'Processing...' : !isConnected ? 'Connect Wallet' : 'Add Liquidity'}
              </button>
            </div>
          )}

          {/* Remove Liquidity Form */}
          {activeTab === 'remove' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Withdrawal Token
                </label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  {getTokensForPair(selectedPair).map((token) => (
                    <option key={token} value={token}>{token}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-700">LP Tokens to Remove</label>
                  <span className="text-sm text-slate-600">
                    Balance: {userPosition ? formatNumber(userPosition.shares, 18) : '0'}
                  </span>
                </div>
                <input
                  type="number"
                  value={removeShares}
                  onChange={(e) => setRemoveShares(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => {
                        if (userPosition) {
                          const shares = (userPosition.shares * BigInt(percent)) / BigInt(100);
                          setRemoveShares(formatUnits(shares, 18));
                        }
                      }}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>

              {removeShares && estimatedReturn && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-sm">
                    <div className="flex justify-between text-amber-700">
                      <span>Estimated Return</span>
                      <span className="font-semibold">~${formatNumber(estimatedReturn)}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleRemoveLiquidity}
                disabled={loading || !isConnected || !removeShares || parseFloat(removeShares) === 0}
                className="w-full bg-red-600 text-white py-4 px-4 rounded-xl font-semibold hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {loading ? 'Processing...' : !isConnected ? 'Connect Wallet' : 'Remove Liquidity'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Information Box */}
      <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
        <h3 className="text-sm font-semibold text-purple-900 mb-2">
          {activeTab === 'add' ? 'Benefits of Providing Liquidity' : 'Important Information'}
        </h3>
        <ul className="text-xs text-purple-700 space-y-1">
          {activeTab === 'add' ? (
            <>
              <li>• Earn trading fees from every swap in this pool</li>
              <li>• Receive LP tokens representing your share of the pool</li>
              <li>• Automatic compounding of fees into your position</li>
              <li>• No impermanent loss for stablecoin pairs</li>
              <li>• Withdraw your liquidity anytime without penalty</li>
            </>
          ) : (
            <>
              <li>• You can withdraw to any token in the pair</li>
              <li>• Accumulated fees are automatically included</li>
              <li>• No withdrawal fees or penalties</li>
              <li>• LP tokens can be transferred or used as collateral</li>
              <li>• Monitor your position value in real-time</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}