import { useState, useEffect, useCallback } from 'react';
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

interface StakeTabProps {
  market: Market;
  refetchTrigger?: number;
}

export function StakeTab({ market, refetchTrigger }: StakeTabProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [selectedOutcome, setSelectedOutcome] = useState<0 | 1>(1);
  const [stakeAmount, setStakeAmount] = useState('100');
  const [lockDays, setLockDays] = useState('7');
  const [isPermanentLock, setIsPermanentLock] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [userStake, setUserStake] = useState<{
    amount: bigint;
    weight: bigint;
    lockUntil: bigint;
    isPermanentLock: boolean;
  } | null>(null);
  const [poolInfo, setPoolInfo] = useState<{
    totalWeight: bigint;
    marketEndTime: bigint;
    currentWeightFactor: bigint;
  } | null>(null);

  // Store both YES and NO pool info for comparison
  const [yesPoolInfo, setYesPoolInfo] = useState<{
    totalWeight: bigint;
    stakedAmount: bigint;
    totalSupply: bigint;
  } | null>(null);
  const [noPoolInfo, setNoPoolInfo] = useState<{
    totalWeight: bigint;
    stakedAmount: bigint;
    totalSupply: bigint;
  } | null>(null);

  const [justApproved, setJustApproved] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: tokenAllowance } = useReadContract({
    address: contracts.mockCTF,
    abi: MockCTF.abi,
    functionName: 'isApprovedForAll',
    args: address && market.conditionId ? [address, contracts.stakingBribe] : undefined,
  });

  // Fetch user token balance
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!address || !publicClient) return;

      try {
        const tokenId = await publicClient.readContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'getTokenId',
          args: [market.conditionId as `0x${string}`, selectedOutcome],
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
  }, [address, publicClient, market.conditionId, selectedOutcome, isSuccess, refetchTrigger]);

  // Fetch user stake info
  useEffect(() => {
    const fetchUserStake = async () => {
      if (!address || !publicClient) return;

      try {
        const result = await publicClient.readContract({
          address: contracts.stakingBribe,
          abi: StakingBribe.abi,
          functionName: 'getUserStake',
          args: [market.conditionId as `0x${string}`, selectedOutcome, address],
        }) as [bigint, bigint, bigint, boolean];

        setUserStake({
          amount: result[0],
          weight: result[1],
          lockUntil: result[2],
          isPermanentLock: result[3],
        });
      } catch (error) {
        console.error('Failed to fetch user stake:', error);
        setUserStake(null);
      }
    };

    fetchUserStake();
  }, [address, publicClient, market.conditionId, selectedOutcome, isSuccess]);

  // Fetch pool info
  useEffect(() => {
    const fetchPoolInfo = async () => {
      if (!publicClient) return;

      try {
        const result = await publicClient.readContract({
          address: contracts.stakingBribe,
          abi: StakingBribe.abi,
          functionName: 'getPoolInfo',
          args: [market.conditionId as `0x${string}`, selectedOutcome],
        }) as [bigint, bigint, bigint];

        setPoolInfo({
          totalWeight: result[0],
          marketEndTime: result[1],
          currentWeightFactor: result[2],
        });
      } catch (error) {
        console.error('Failed to fetch pool info:', error);
        setPoolInfo(null);
      }
    };

    fetchPoolInfo();
  }, [publicClient, market.conditionId, selectedOutcome, isSuccess]);

  // Fetch both YES and NO pool info for comparison
  useEffect(() => {
    const fetchBothPools = async () => {
      if (!publicClient) return;

      try {
        // Fetch YES pool (outcome = 1)
        const [yesPoolResult, yesTokenId] = await Promise.all([
          publicClient.readContract({
            address: contracts.stakingBribe,
            abi: StakingBribe.abi,
            functionName: 'getPoolInfo',
            args: [market.conditionId as `0x${string}`, 1],
          }) as Promise<[bigint, bigint, bigint]>,
          publicClient.readContract({
            address: contracts.mockCTF,
            abi: MockCTF.abi,
            functionName: 'getTokenId',
            args: [market.conditionId as `0x${string}`, 1],
          }) as Promise<bigint>,
        ]);

        const [yesStaked, yesTotalSupply] = await Promise.all([
          publicClient.readContract({
            address: contracts.mockCTF,
            abi: MockCTF.abi,
            functionName: 'balanceOf',
            args: [contracts.stakingBribe, yesTokenId],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contracts.mockCTF,
            abi: MockCTF.abi,
            functionName: 'getOutcomeSupply',
            args: [market.conditionId as `0x${string}`, 1],
          }) as Promise<bigint>,
        ]);

        setYesPoolInfo({
          totalWeight: yesPoolResult[0],
          stakedAmount: yesStaked,
          totalSupply: yesTotalSupply,
        });

        // Fetch NO pool (outcome = 0)
        const [noPoolResult, noTokenId] = await Promise.all([
          publicClient.readContract({
            address: contracts.stakingBribe,
            abi: StakingBribe.abi,
            functionName: 'getPoolInfo',
            args: [market.conditionId as `0x${string}`, 0],
          }) as Promise<[bigint, bigint, bigint]>,
          publicClient.readContract({
            address: contracts.mockCTF,
            abi: MockCTF.abi,
            functionName: 'getTokenId',
            args: [market.conditionId as `0x${string}`, 0],
          }) as Promise<bigint>,
        ]);

        const [noStaked, noTotalSupply] = await Promise.all([
          publicClient.readContract({
            address: contracts.mockCTF,
            abi: MockCTF.abi,
            functionName: 'balanceOf',
            args: [contracts.stakingBribe, noTokenId],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contracts.mockCTF,
            abi: MockCTF.abi,
            functionName: 'getOutcomeSupply',
            args: [market.conditionId as `0x${string}`, 0],
          }) as Promise<bigint>,
        ]);

        setNoPoolInfo({
          totalWeight: noPoolResult[0],
          stakedAmount: noStaked,
          totalSupply: noTotalSupply,
        });
      } catch (error) {
        console.error('Failed to fetch both pools:', error);
      }
    };

    fetchBothPools();
  }, [publicClient, market.conditionId, isSuccess]);

  const executeStake = useCallback(() => {
    if (!stakeAmount) return;
    if (!isPermanentLock && !lockDays) return;

    try {
      const amount = parseUnits(stakeAmount, 6);

      if (isPermanentLock) {
        writeContract({
          address: contracts.stakingBribe as `0x${string}`,
          abi: StakingBribe.abi,
          functionName: 'stakePermanent',
          args: [market.conditionId as `0x${string}`, selectedOutcome as 0 | 1, amount],
        });
      } else {
        const lockDuration = BigInt(parseInt(lockDays) * 24 * 60 * 60);
        writeContract({
          address: contracts.stakingBribe as `0x${string}`,
          abi: StakingBribe.abi,
          functionName: 'stake',
          args: [market.conditionId as `0x${string}`, selectedOutcome as 0 | 1, amount, lockDuration],
        });
      }
    } catch (error) {
      console.error('Stake failed:', error);
    }
  }, [market.conditionId, stakeAmount, isPermanentLock, lockDays, selectedOutcome, writeContract]);

  useEffect(() => {
    if (justApproved && tokenAllowance && !isPending && !isConfirming) {
      setJustApproved(false);
      executeStake();
    }
  }, [justApproved, tokenAllowance, isPending, isConfirming, executeStake]);

  const handleStake = async () => {
    if (!stakeAmount) return;
    if (!isPermanentLock && !lockDays) return;

    // Validate balance
    const stakeAmountBigInt = BigInt(stakeAmount);
    if (stakeAmountBigInt > tokenBalance) {
      alert(`Insufficient balance. You have ${tokenBalance.toString()} tokens but trying to stake ${stakeAmount}`);
      return;
    }

    if (!tokenAllowance) {
      setJustApproved(true);
      writeContract({
        address: contracts.mockCTF,
        abi: MockCTF.abi,
        functionName: 'setApprovalForAll',
        args: [contracts.stakingBribe, true],
      });
      return;
    }

    executeStake();
  };


  const handleUnstake = async () => {
    try {
      writeContract({
        address: contracts.stakingBribe as `0x${string}`,
        abi: StakingBribe.abi,
        functionName: 'unstake',
        args: [market.conditionId as `0x${string}`, selectedOutcome as 0 | 1],
      });
    } catch (error) {
      console.error('Unstake failed:', error);
    }
  };

  const handleIncreaseAmount = async () => {
    if (!stakeAmount) return;

    try {
      const amount = parseUnits(stakeAmount, 6);

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
        args: [market.conditionId as `0x${string}`, selectedOutcome as 0 | 1, amount],
      });
    } catch (error) {
      console.error('Increase amount failed:', error);
    }
  };

  const handleExtendLock = async () => {
    if (!lockDays) return;

    try {
      const lockDuration = BigInt(parseInt(lockDays) * 24 * 60 * 60);

      writeContract({
        address: contracts.stakingBribe as `0x${string}`,
        abi: StakingBribe.abi,
        functionName: 'extendLock',
        args: [market.conditionId as `0x${string}`, selectedOutcome as 0 | 1, lockDuration],
      });
    } catch (error) {
      console.error('Extend lock failed:', error);
    }
  };

  const isLocked = userStake ? userStake.lockUntil > BigInt(Math.floor(Date.now() / 1000)) : false;

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pool Info - Both YES and NO */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>📊 Pool Info</CardTitle>
            <CardDescription>Compare YES and NO pool statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {yesPoolInfo && noPoolInfo && (
              <>
                {/* YES Pool */}
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="default" className="bg-green-500">✅ YES Pool</Badge>
                    {yesPoolInfo.totalSupply > 0n && (
                      <span className="text-xs text-green-600 font-semibold">
                        {((Number(yesPoolInfo.stakedAmount) / Number(yesPoolInfo.totalSupply)) * 100).toFixed(1)}% locked
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Staked / Total:</span>
                      <span className="font-mono font-semibold text-green-600">
                        {formatUnits(yesPoolInfo.stakedAmount, 6)} / {formatUnits(yesPoolInfo.totalSupply, 6)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Weight:</span>
                      <span className="font-mono text-xs">{formatUnits(yesPoolInfo.totalWeight, 18)}</span>
                    </div>
                  </div>
                </div>

                {/* NO Pool */}
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="destructive">❌ NO Pool</Badge>
                    {noPoolInfo.totalSupply > 0n && (
                      <span className="text-xs text-red-600 font-semibold">
                        {((Number(noPoolInfo.stakedAmount) / Number(noPoolInfo.totalSupply)) * 100).toFixed(1)}% locked
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Staked / Total:</span>
                      <span className="font-mono font-semibold text-red-600">
                        {formatUnits(noPoolInfo.stakedAmount, 6)} / {formatUnits(noPoolInfo.totalSupply, 6)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Weight:</span>
                      <span className="font-mono text-xs">{formatUnits(noPoolInfo.totalWeight, 18)}</span>
                    </div>
                  </div>
                </div>

                {/* Market End Time */}
                {poolInfo && poolInfo.marketEndTime > 0n && (
                  <div className="flex justify-between text-sm pt-3 border-t">
                    <span className="text-muted-foreground">Market End:</span>
                    <span className="font-mono text-xs">{new Date(Number(poolInfo.marketEndTime) * 1000).toLocaleString()}</span>
                  </div>
                )}
              </>
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
            {/* Outcome Selector */}
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
                      <div className="flex items-center justify-between">
                        <Label htmlFor="increaseAmount">Additional Amount</Label>
                        <span className="text-xs text-muted-foreground">
                          Balance: {tokenBalance.toString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="increaseAmount"
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="100"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setStakeAmount(tokenBalance.toString())}
                          disabled={tokenBalance === 0n}
                        >
                          Max
                        </Button>
                      </div>
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
                    {userStake.isPermanentLock ? (
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          🔒 This is a <span className="font-semibold">permanent lock</span>. Cannot extend further.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Will unlock after market settlement.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="extendDate">New Lock End Date</Label>
                          <Input
                            id="extendDate"
                            type="date"
                            value={lockDays}
                            onChange={(e) => {
                              // Convert date to days from now
                              const selectedDate = new Date(e.target.value);
                              const now = new Date();
                              const diffDays = Math.ceil((selectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              setLockDays(diffDays > 0 ? diffDays.toString() : '');
                            }}
                            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          />
                          <p className="text-xs text-muted-foreground">
                            Current lock ends: {new Date(Number(userStake.lockUntil) * 1000).toLocaleDateString()}
                          </p>
                          {lockDays && (
                            <p className="text-xs text-green-600">
                              New duration: {lockDays} days from now
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={handleExtendLock}
                          disabled={isPending || isConfirming || !lockDays}
                          className="w-full"
                        >
                          {isPending ? 'Confirming...' : isConfirming ? 'Extending...' : 'Extend Lock Time'}
                        </Button>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              /* No Position - Initial Stake */
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stakeAmount">Amount</Label>
                    <span className="text-xs text-muted-foreground">
                      Balance: {tokenBalance.toString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="stakeAmount"
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="100"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setStakeAmount(tokenBalance.toString())}
                      disabled={tokenBalance === 0n}
                    >
                      Max
                    </Button>
                  </div>
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

                {/* Lock Duration Slider */}
                {!isPermanentLock && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="lockDays">锁定时长: {lockDays} 天</Label>
                      <span className="text-xs text-muted-foreground">
                        权重: {lockDays && market ? ((parseInt(lockDays) * 24 * 60 * 60) / (Number(market.endTime) - Number(market.startTime)) * 50).toFixed(1) : 0}%
                      </span>
                    </div>
                    <Slider
                      id="lockDays"
                      min={1}
                      max={market ? Math.max(1, Math.floor((Number(market.endTime) - Date.now() / 1000 - 86400) / 86400)) : 30}
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

            {/* Your Position */}
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

                  <div className="pt-4 border-t space-y-2">
                    <Button
                      onClick={handleUnstake}
                      disabled={isPending || isConfirming || isLocked}
                      className="w-full"
                      variant="destructive"
                    >
                      {isLocked ? '🔒 Locked' : 'Unstake'}
                    </Button>
                    {isLocked && (
                      <p className="text-xs text-muted-foreground text-center">
                        Unlock on: {new Date(Number(userStake.lockUntil) * 1000).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      💡 To claim bribes, go to the Bribes tab
                    </p>
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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>ℹ️ How Staking Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Select an outcome (YES or NO) to stake</li>
            <li>Stake your outcome tokens with a lock duration</li>
            <li>Longer locks = higher voting weight = more influence</li>
            <li>Your share of bribes = Your weight / Total weight</li>
            <li>Unstake after lock expires. Claim bribes in the Bribes tab</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
