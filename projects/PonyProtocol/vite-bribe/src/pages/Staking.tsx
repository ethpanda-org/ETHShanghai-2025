import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { contracts } from '../config/contracts';
import MockCTF from '../contracts/MockCTF.json';
import StakingBribe from '../contracts/StakingBribe.json';
import { parseUnits, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

interface Market {
  conditionId: string;
  oracle: string;
  questionId: string;
  outcomeSlotCount: number;
  initialYesPrice: string;
  blockNumber: string;
  transactionHash: string;
  createdAt: number;
  startTime: string;
  endTime: string;
}

export default function Staking() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState<Market[]>([]);

  // Selected market and outcome
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<0 | 1>(1); // 0=NO, 1=YES

  // Stake states
  const [stakeAmount, setStakeAmount] = useState('100');
  const [lockDays, setLockDays] = useState('7');
  const [isPermanentLock, setIsPermanentLock] = useState(false);

  // User position data
  const [userStake, setUserStake] = useState<{
    amount: bigint;
    weight: bigint;
    lockUntil: bigint;
    pendingRewards: bigint;
    isPermanentLock: boolean;
  } | null>(null);

  // Pool info
  const [poolInfo, setPoolInfo] = useState<{
    totalWeight: bigint;
    totalBribes: bigint;
    claimedBribes: bigint;
    marketEndTime: bigint;
    currentWeightFactor: bigint;
  } | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Track if we just approved to auto-trigger stake
  const [justApproved, setJustApproved] = useState(false);

  // Read user's outcome token balance
  const selectedMarket = markets.find(m => m.conditionId === selectedMarketId);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);

  // Read token allowance for StakingBribe
  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.mockCTF,
    abi: MockCTF.abi,
    functionName: 'isApprovedForAll',
    args: address && selectedMarketId ? [address, contracts.stakingBribe] : undefined,
  });

  // Fetch markets from backend
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('http://localhost:3000/markets');
        const data = await response.json();
        setMarkets(data);
        if (data.length > 0 && !selectedMarketId) {
          setSelectedMarketId(data[0].conditionId);
        }
      } catch (error) {
        console.error('Failed to fetch markets:', error);
      }
    };

    fetchMarkets();
    if (isSuccess) {
      setTimeout(fetchMarkets, 2000);
      refetchAllowance();
    }
  }, [isSuccess, refetchAllowance, selectedMarketId]);

  // Fetch user token balance
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!address || !publicClient || !selectedMarketId) return;

      try {
        // Calculate tokenId for the selected outcome
        const tokenId = await publicClient.readContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'getTokenId',
          args: [selectedMarketId as `0x${string}`, selectedOutcome],
        }) as bigint;

        const balance = await publicClient.readContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'balanceOf',
          args: [address, tokenId],
        }) as bigint;

        setTokenBalance(balance);
      } catch (error) {
        console.error('Failed to fetch token balance:', error);
      }
    };

    fetchTokenBalance();
  }, [address, publicClient, selectedMarketId, selectedOutcome, isSuccess]);

  // Fetch user stake info
  useEffect(() => {
    const fetchUserStake = async () => {
      if (!address || !publicClient || !selectedMarketId) return;

      try {
        const result = await publicClient.readContract({
          address: contracts.stakingBribe,
          abi: StakingBribe.abi,
          functionName: 'getUserStake',
          args: [selectedMarketId as `0x${string}`, selectedOutcome, address],
        }) as [bigint, bigint, bigint, bigint, boolean];

        setUserStake({
          amount: result[0],
          weight: result[1],
          lockUntil: result[2],
          pendingRewards: result[3],
          isPermanentLock: result[4],
        });
      } catch (error) {
        console.error('Failed to fetch user stake:', error);
        setUserStake(null);
      }
    };

    fetchUserStake();
  }, [address, publicClient, selectedMarketId, selectedOutcome, isSuccess]);

  // Fetch pool info
  useEffect(() => {
    const fetchPoolInfo = async () => {
      if (!publicClient || !selectedMarketId) return;

      try {
        const result = await publicClient.readContract({
          address: contracts.stakingBribe,
          abi: StakingBribe.abi,
          functionName: 'getPoolInfo',
          args: [selectedMarketId as `0x${string}`, selectedOutcome],
        }) as [bigint, bigint, bigint, bigint, bigint];

        setPoolInfo({
          totalWeight: result[0],
          totalBribes: result[1],
          claimedBribes: result[2],
          marketEndTime: result[3],
          currentWeightFactor: result[4],
        });
      } catch (error) {
        console.error('Failed to fetch pool info:', error);
        setPoolInfo(null);
      }
    };

    fetchPoolInfo();
  }, [publicClient, selectedMarketId, selectedOutcome, isSuccess]);

  // Auto-trigger stake after approval
  useEffect(() => {
    if (justApproved && tokenAllowance && !isPending && !isConfirming) {
      setJustApproved(false);
      // Trigger stake automatically
      executeStake();
    }
  }, [justApproved, tokenAllowance, isPending, isConfirming]);

  const executeStake = () => {
    if (!selectedMarketId || !stakeAmount) return;
    if (!isPermanentLock && !lockDays) return;

    try {
      const amount = parseUnits(stakeAmount, 6);

      if (isPermanentLock) {
        writeContract({
          address: contracts.stakingBribe as `0x${string}`,
          abi: StakingBribe.abi,
          functionName: 'stakePermanent',
          args: [selectedMarketId as `0x${string}`, selectedOutcome as 0 | 1, amount],
        });
      } else {
        const lockDuration = BigInt(parseInt(lockDays) * 24 * 60 * 60);
        writeContract({
          address: contracts.stakingBribe as `0x${string}`,
          abi: StakingBribe.abi,
          functionName: 'stake',
          args: [selectedMarketId as `0x${string}`, selectedOutcome as 0 | 1, amount, lockDuration],
        });
      }
    } catch (error) {
      console.error('Stake failed:', error);
    }
  };

  const handleStake = async () => {
    if (!selectedMarketId || !stakeAmount) return;
    if (!isPermanentLock && !lockDays) return;

    // Check if approved
    if (!tokenAllowance) {
      // Approve first, then auto-trigger stake
      setJustApproved(true);
      writeContract({
        address: contracts.mockCTF,
        abi: MockCTF.abi,
        functionName: 'setApprovalForAll',
        args: [contracts.stakingBribe, true],
      });
      return;
    }

    // Already approved, stake directly
    executeStake();
  };

  const handleClaimRewards = async () => {
    if (!selectedMarketId) return;

    try {
      writeContract({
        address: contracts.stakingBribe as `0x${string}`,
        abi: StakingBribe.abi,
        functionName: 'claimRewards',
        args: [selectedMarketId as `0x${string}`, selectedOutcome as 0 | 1],
      });
    } catch (error) {
      console.error('Claim rewards failed:', error);
    }
  };

  const handleUnstake = async () => {
    if (!selectedMarketId) return;

    try {
      writeContract({
        address: contracts.stakingBribe as `0x${string}`,
        abi: StakingBribe.abi,
        functionName: 'unstake',
        args: [selectedMarketId as `0x${string}`, selectedOutcome as 0 | 1],
      });
    } catch (error) {
      console.error('Unstake failed:', error);
    }
  };

  const handleIncreaseAmount = async () => {
    if (!selectedMarketId || !stakeAmount) return;

    try {
      const amount = parseUnits(stakeAmount, 6);

      // Check if approved
      if (!tokenAllowance) {
        writeContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'setApprovalForAll',
          args: [contracts.stakingBribe, true],
        });
        return;
      }

      writeContract({
        address: contracts.stakingBribe as `0x${string}`,
        abi: StakingBribe.abi,
        functionName: 'increaseAmount',
        args: [selectedMarketId as `0x${string}`, selectedOutcome as 0 | 1, amount],
      });
    } catch (error) {
      console.error('Increase amount failed:', error);
    }
  };

  const handleExtendLock = async () => {
    if (!selectedMarketId || !lockDays) return;

    try {
      const lockDuration = BigInt(parseInt(lockDays) * 24 * 60 * 60);

      writeContract({
        address: contracts.stakingBribe as `0x${string}`,
        abi: StakingBribe.abi,
        functionName: 'extendLock',
        args: [selectedMarketId as `0x${string}`, selectedOutcome as 0 | 1, lockDuration],
      });
    } catch (error) {
      console.error('Extend lock failed:', error);
    }
  };

  const decodeQuestionId = (hex: string) => {
    try {
      const cleanHex = hex.replace('0x', '').replace(/0+$/, '');
      const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      return new TextDecoder().decode(bytes);
    } catch {
      return hex.slice(0, 20) + '...';
    }
  };

  const isLocked = userStake ? userStake.lockUntil > BigInt(Math.floor(Date.now() / 1000)) : false;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🔒 Staking & Bribes</h1>
        <p className="text-muted-foreground">Stake outcome tokens to earn bribe rewards (veCRV-style)</p>
      </div>

      {!isConnected ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg text-muted-foreground">Connect your wallet to stake tokens</p>
              <ConnectButton />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Pool Info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>📊 Pool Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Market Selector */}
              <div className="space-y-2">
                <Label>Select Market</Label>
                <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map((market) => (
                      <SelectItem key={market.conditionId} value={market.conditionId}>
                        {decodeQuestionId(market.questionId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Outcome Display */}
              <div className="space-y-2">
                <Label>Current Pool</Label>
                <div className="text-center p-2 bg-muted rounded-md">
                  <Badge variant={selectedOutcome === 1 ? "default" : "secondary"} className="text-lg">
                    {selectedOutcome === 1 ? '✅ YES' : '❌ NO'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Switch outcome in the Stake card →
                </p>
              </div>

              {/* Pool Stats */}
              {poolInfo && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Bribes:</span>
                    <span className="font-mono font-semibold">{formatUnits(poolInfo.totalBribes, 6)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Claimed:</span>
                    <span className="font-mono">{formatUnits(poolInfo.claimedBribes, 6)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Weight:</span>
                    <span className="font-mono">{formatUnits(poolInfo.totalWeight, 18)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Factor:</span>
                    <span className="font-mono">{(Number(poolInfo.currentWeightFactor) / 1e18 * 100).toFixed(1)}%</span>
                  </div>
                  {poolInfo.marketEndTime > 0n && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Market End:</span>
                      <span className="font-mono text-xs">{new Date(Number(poolInfo.marketEndTime) * 1000).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Stake & Position */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>💰 Stake & Position</CardTitle>
              <CardDescription>
                Balance: {formatUnits(tokenBalance, 6)} {selectedOutcome === 1 ? 'YES' : 'NO'} tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Outcome Selector - Always visible */}
              <div className="space-y-2">
                <Label>Stake Which Token?</Label>
                <Tabs value={selectedOutcome.toString()} onValueChange={(v) => setSelectedOutcome(parseInt(v) as 0 | 1)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="1">✅ YES</TabsTrigger>
                    <TabsTrigger value="0">❌ NO</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {userStake && userStake.amount > 0n ? (
                /* Existing Position - Curve Style Management */
                <>
                  <Alert>
                    <AlertDescription>
                      You have an existing position. You can increase amount or extend lock time.
                    </AlertDescription>
                  </Alert>

                  <Tabs defaultValue="increase" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="increase">Increase Amount</TabsTrigger>
                      <TabsTrigger value="extend">Extend Lock</TabsTrigger>
                    </TabsList>

                    <TabsContent value="increase" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="increaseAmount">Additional Amount</Label>
                        <Input
                          id="increaseAmount"
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="100"
                        />
                      </div>
                      <Button
                        onClick={handleIncreaseAmount}
                        disabled={isPending || isConfirming || !stakeAmount}
                        className="w-full"
                      >
                        {isPending ? 'Confirming...' : isConfirming ?
                          (tokenAllowance ? 'Increasing...' : 'Approving...') :
                          (tokenAllowance ? 'Increase Amount' : 'Approve & Increase')}
                      </Button>
                    </TabsContent>

                    <TabsContent value="extend" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="extendDays">New Lock Duration (days from now)</Label>
                        <Input
                          id="extendDays"
                          type="number"
                          value={lockDays}
                          onChange={(e) => setLockDays(e.target.value)}
                          placeholder="14"
                          min="1"
                        />
                        <p className="text-xs text-muted-foreground">
                          Current lock ends: {new Date(Number(userStake.lockUntil) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={handleExtendLock}
                        disabled={isPending || isConfirming || !lockDays}
                        className="w-full"
                      >
                        {isPending ? 'Confirming...' : isConfirming ? 'Extending...' : 'Extend Lock Time'}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                /* No Position - Initial Stake */
                <>
                  <div className="space-y-2">
                    <Label htmlFor="stakeAmount">Amount</Label>
                    <Input
                      id="stakeAmount"
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="100"
                    />
                  </div>

                  {/* Permanent Lock Checkbox */}
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
                    <Checkbox
                      id="permanent-lock"
                      checked={isPermanentLock}
                      onCheckedChange={(checked) => setIsPermanentLock(checked as boolean)}
                    />
                    <label
                      htmlFor="permanent-lock"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      永久锁仓 (2x 投票权重，市场结算后解锁)
                    </label>
                  </div>

                  {/* Lock Duration Slider (disabled if permanent lock) */}
                  {!isPermanentLock && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="lockDays">锁定时长: {lockDays} 天</Label>
                        <span className="text-xs text-muted-foreground">
                          权重: {lockDays && selectedMarket ? ((parseInt(lockDays) * 24 * 60 * 60) / (Number(selectedMarket.endTime) - Number(selectedMarket.startTime)) * 50).toFixed(1) : 0}%
                        </span>
                      </div>
                      <Slider
                        id="lockDays"
                        min={1}
                        max={selectedMarket ? Math.max(1, Math.floor((Number(selectedMarket.endTime) - Date.now() / 1000 - 86400) / 86400)) : 30}
                        step={1}
                        value={[parseInt(lockDays) || 1]}
                        onValueChange={(value) => setLockDays(value[0].toString())}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        最长可锁定到市场结束前 1 天（临结算期）
                      </p>
                    </div>
                  )}

                  {isPermanentLock && (
                    <Alert>
                      <AlertDescription>
                        💎 永久锁仓：获得 2 倍投票权重，但只能在市场结算后解锁
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleStake}
                    disabled={isPending || isConfirming || !stakeAmount || (!isPermanentLock && !lockDays)}
                    className="w-full"
                    size="lg"
                  >
                    {isPending ? 'Confirming...' : isConfirming ?
                      (tokenAllowance ? 'Staking...' : 'Approving...') :
                      (tokenAllowance ? (isPermanentLock ? '永久锁仓 (2x)' : '临时锁仓 (0.5x)') : 'Approve & Stake')}
                  </Button>
                </>
              )}

              {isSuccess && (
                <Alert>
                  <AlertDescription>✅ Transaction successful!</AlertDescription>
                </Alert>
              )}

              {/* Your Position - Integrated */}
              <div className="pt-4 mt-4 border-t">
                <h3 className="font-semibold mb-3">👤 Your Position</h3>
                {userStake && userStake.amount > 0n ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Staked:</span>
                      <span className="font-mono font-semibold">{formatUnits(userStake.amount, 6)} tokens</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="font-mono">{formatUnits(userStake.weight, 18)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lock Until:</span>
                      <span className="font-mono text-xs">{new Date(Number(userStake.lockUntil) * 1000).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lock Type:</span>
                      {userStake.isPermanentLock ? (
                        <Badge variant="default" className="bg-purple-600">💎 Permanent (2x)</Badge>
                      ) : (
                        <Badge variant="secondary">Temporary (0.5x)</Badge>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      {isLocked ? (
                        <Badge variant="destructive">Locked</Badge>
                      ) : (
                        <Badge variant="default">Unlocked</Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-muted-foreground">Pending Rewards:</span>
                      <span className="font-mono font-bold text-lg text-green-600">
                        {formatUnits(userStake.pendingRewards, 6)} USDC
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Button
                        onClick={handleClaimRewards}
                        disabled={isPending || isConfirming || userStake.pendingRewards === 0n}
                        className="w-full"
                        variant="default"
                      >
                        Claim Rewards
                      </Button>

                      <Button
                        onClick={handleUnstake}
                        disabled={isPending || isConfirming || isLocked}
                        className="w-full"
                        variant="destructive"
                      >
                        {isLocked ? 'Locked' : 'Unstake & Claim All'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No active stake</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>ℹ️ How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Select a market and outcome (YES or NO)</li>
            <li>Stake your outcome tokens with a lock duration</li>
            <li>Longer locks = higher voting weight = more rewards</li>
            <li>Your share of bribes = Your weight / Total weight</li>
            <li>Claim rewards anytime, unstake after lock expires</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
