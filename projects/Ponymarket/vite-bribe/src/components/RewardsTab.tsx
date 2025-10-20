import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { contracts } from '../config/contracts';
import BribeManager from '../contracts/BribeManager.json';
import StakingBribe from '../contracts/StakingBribe.json';
import MockERC20 from '../contracts/MockERC20.json';
import { formatUnits } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RewardReleaseChart } from './RewardReleaseChart';

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

interface BribePoolInfo {
  id: bigint;
  sponsor: string;
  token: string;
  tokenSymbol: string;
  tokenDecimals: number;
  totalAmount: bigint;
  startTime: bigint;
  endTime: bigint;
  conditionId: string;
  outcome: number;
  userPending: bigint;
  userClaimed: bigint;
}

interface StakerInfo {
  address: string;
  weight: bigint;
  amount: bigint;
  sharePercentage: number;
}

interface RewardsTabProps {
  market: Market;
}

export function RewardsTab({ market }: RewardsTabProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [yesBribes, setYesBribes] = useState<BribePoolInfo[]>([]);
  const [noBribes, setNoBribes] = useState<BribePoolInfo[]>([]);
  const [yesTopStakers, setYesTopStakers] = useState<StakerInfo[]>([]);
  const [noTopStakers, setNoTopStakers] = useState<StakerInfo[]>([]);
  const [yesTotalWeight, setYesTotalWeight] = useState<bigint>(0n);
  const [noTotalWeight, setNoTotalWeight] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Fetch all bribe pools and staker rankings
  useEffect(() => {
    const fetchData = async () => {
      if (!publicClient) return;

      setIsLoading(true);
      try {
        // Fetch YES pool bribes (outcome = 1)
        const yesBribeIds = await publicClient.readContract({
          address: contracts.bribeManager,
          abi: BribeManager.abi,
          functionName: 'getBribePoolsByMarket',
          args: [market.conditionId as `0x${string}`, 1],
        }) as bigint[];

        const yesBribesData: BribePoolInfo[] = [];
        for (const bribeId of yesBribeIds) {
          const bribePool = await publicClient.readContract({
            address: contracts.bribeManager,
            abi: BribeManager.abi,
            functionName: 'getBribePool',
            args: [bribeId],
          }) as any;

          const [symbol, decimals] = await Promise.all([
            publicClient.readContract({
              address: bribePool.token as `0x${string}`,
              abi: MockERC20.abi,
              functionName: 'symbol',
            }) as Promise<string>,
            publicClient.readContract({
              address: bribePool.token as `0x${string}`,
              abi: MockERC20.abi,
              functionName: 'decimals',
            }) as Promise<number>,
          ]);

          let userPending = 0n;
          let userClaimed = 0n;
          if (address) {
            userPending = await publicClient.readContract({
              address: contracts.bribeManager,
              abi: BribeManager.abi,
              functionName: 'pendingBribeRewards',
              args: [bribeId, address],
            }) as bigint;

            userClaimed = await publicClient.readContract({
              address: contracts.bribeManager,
              abi: BribeManager.abi,
              functionName: 'userBribeClaimed',
              args: [bribeId, address],
            }) as bigint;
          }

          yesBribesData.push({
            id: bribePool.id,
            sponsor: bribePool.sponsor,
            token: bribePool.token,
            tokenSymbol: symbol,
            tokenDecimals: decimals,
            totalAmount: bribePool.totalAmount,
            startTime: bribePool.startTime,
            endTime: bribePool.endTime,
            conditionId: bribePool.conditionId,
            outcome: bribePool.outcome,
            userPending,
            userClaimed,
          });
        }
        setYesBribes(yesBribesData);

        // Fetch NO pool bribes (outcome = 0)
        const noBribeIds = await publicClient.readContract({
          address: contracts.bribeManager,
          abi: BribeManager.abi,
          functionName: 'getBribePoolsByMarket',
          args: [market.conditionId as `0x${string}`, 0],
        }) as bigint[];

        const noBribesData: BribePoolInfo[] = [];
        for (const bribeId of noBribeIds) {
          const bribePool = await publicClient.readContract({
            address: contracts.bribeManager,
            abi: BribeManager.abi,
            functionName: 'getBribePool',
            args: [bribeId],
          }) as any;

          const [symbol, decimals] = await Promise.all([
            publicClient.readContract({
              address: bribePool.token as `0x${string}`,
              abi: MockERC20.abi,
              functionName: 'symbol',
            }) as Promise<string>,
            publicClient.readContract({
              address: bribePool.token as `0x${string}`,
              abi: MockERC20.abi,
              functionName: 'decimals',
            }) as Promise<number>,
          ]);

          let userPending = 0n;
          let userClaimed = 0n;
          if (address) {
            userPending = await publicClient.readContract({
              address: contracts.bribeManager,
              abi: BribeManager.abi,
              functionName: 'pendingBribeRewards',
              args: [bribeId, address],
            }) as bigint;

            userClaimed = await publicClient.readContract({
              address: contracts.bribeManager,
              abi: BribeManager.abi,
              functionName: 'userBribeClaimed',
              args: [bribeId, address],
            }) as bigint;
          }

          noBribesData.push({
            id: bribePool.id,
            sponsor: bribePool.sponsor,
            token: bribePool.token,
            tokenSymbol: symbol,
            tokenDecimals: decimals,
            totalAmount: bribePool.totalAmount,
            startTime: bribePool.startTime,
            endTime: bribePool.endTime,
            conditionId: bribePool.conditionId,
            outcome: bribePool.outcome,
            userPending,
            userClaimed,
          });
        }
        setNoBribes(noBribesData);

        // Get pool total weights
        const yesPoolInfo = await publicClient.readContract({
          address: contracts.stakingBribe,
          abi: StakingBribe.abi,
          functionName: 'getPoolInfo',
          args: [market.conditionId as `0x${string}`, 1],
        }) as [bigint, bigint, bigint];
        setYesTotalWeight(yesPoolInfo[0]);

        const noPoolInfo = await publicClient.readContract({
          address: contracts.stakingBribe,
          abi: StakingBribe.abi,
          functionName: 'getPoolInfo',
          args: [market.conditionId as `0x${string}`, 0],
        }) as [bigint, bigint, bigint];
        setNoTotalWeight(noPoolInfo[0]);

        // Show current user's position if connected
        if (address) {
          const yesUserStake = await publicClient.readContract({
            address: contracts.stakingBribe,
            abi: StakingBribe.abi,
            functionName: 'getUserStake',
            args: [market.conditionId as `0x${string}`, 1, address],
          }) as [bigint, bigint, bigint, boolean];

          if (yesUserStake[1] > 0n) {
            setYesTopStakers([{
              address: address,
              weight: yesUserStake[1],
              amount: yesUserStake[0],
              sharePercentage: yesPoolInfo[0] > 0n
                ? Number(yesUserStake[1] * 10000n / yesPoolInfo[0]) / 100
                : 0,
            }]);
          }

          const noUserStake = await publicClient.readContract({
            address: contracts.stakingBribe,
            abi: StakingBribe.abi,
            functionName: 'getUserStake',
            args: [market.conditionId as `0x${string}`, 0, address],
          }) as [bigint, bigint, bigint, boolean];

          if (noUserStake[1] > 0n) {
            setNoTopStakers([{
              address: address,
              weight: noUserStake[1],
              amount: noUserStake[0],
              sharePercentage: noPoolInfo[0] > 0n
                ? Number(noUserStake[1] * 10000n / noPoolInfo[0]) / 100
                : 0,
            }]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch rewards data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [address, publicClient, market.conditionId, isSuccess]);

  const handleClaimReward = (bribePoolId: bigint) => {
    writeContract({
      address: contracts.bribeManager,
      abi: BribeManager.abi,
      functionName: 'claimBribePool',
      args: [bribePoolId],
    });
  };

  const handleClaimAll = (outcome: 0 | 1) => {
    const bribes = outcome === 1 ? yesBribes : noBribes;
    const claimableIds = bribes.filter(b => b.userPending > 0n).map(b => b.id);
    if (claimableIds.length === 0) return;

    writeContract({
      address: contracts.bribeManager,
      abi: BribeManager.abi,
      functionName: 'claimMultipleBribes',
      args: [claimableIds],
    });
  };

  // Filter REWARD token pools for the release curve chart - separate YES and NO
  const yesRewardPools = useMemo(() => {
    return yesBribes
      .filter(b => b.tokenSymbol === 'REWARD')
      .map(b => ({
        totalAmount: b.totalAmount,
        startTime: b.startTime,
        endTime: b.endTime,
        tokenDecimals: b.tokenDecimals,
      }));
  }, [yesBribes]);

  const noRewardPools = useMemo(() => {
    return noBribes
      .filter(b => b.tokenSymbol === 'REWARD')
      .map(b => ({
        totalAmount: b.totalAmount,
        startTime: b.startTime,
        endTime: b.endTime,
        tokenDecimals: b.tokenDecimals,
      }));
  }, [noBribes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading rewards data...</div>
      </div>
    );
  }

  const renderBribeList = (bribes: BribePoolInfo[], outcome: 'YES' | 'NO') => {
    if (bribes.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No reward pools for {outcome}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {bribes.map((bribe) => (
          <div key={bribe.id.toString()} className={`p-3 rounded-lg border ${outcome === 'YES' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">{bribe.tokenSymbol}</span>
                <Badge variant="outline" className="text-xs">#{bribe.id.toString()}</Badge>
              </div>
              {address && bribe.userPending > 0n && (
                <Button
                  onClick={() => handleClaimReward(bribe.id)}
                  disabled={isPending || isConfirming}
                  size="sm"
                  variant={outcome === 'YES' ? 'default' : 'destructive'}
                  className="h-6 text-xs px-2"
                >
                  {isPending || isConfirming ? '...' : 'Claim'}
                </Button>
              )}
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Total Pool</div>
                <div className="font-mono font-semibold">
                  {formatUnits(bribe.totalAmount, bribe.tokenDecimals)}
                </div>
              </div>
              {address && (
                <>
                  <div>
                    <div className="text-muted-foreground mb-0.5">Your Pending</div>
                    <div className={`font-mono font-semibold ${outcome === 'YES' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatUnits(bribe.userPending, bribe.tokenDecimals)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-0.5">You Claimed</div>
                    <div className="font-mono">
                      {formatUnits(bribe.userClaimed, bribe.tokenDecimals)}
                    </div>
                  </div>
                </>
              )}
              <div>
                <div className="text-muted-foreground mb-0.5">Sponsor</div>
                <div className="font-mono text-xs">
                  {bribe.sponsor.slice(0, 6)}...{bribe.sponsor.slice(-4)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Duration</div>
                <div>
                  {new Date(Number(bribe.startTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(Number(bribe.endTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStakerRanking = (stakers: StakerInfo[], totalWeight: bigint, outcome: 'YES' | 'NO') => {
    if (stakers.length === 0) {
      return (
        <div className="text-center py-6 text-sm text-muted-foreground">
          {address ? 'You have no stake in this pool' : 'Connect wallet to see your position'}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {stakers.map((staker, index) => (
          <div key={staker.address} className={`p-3 rounded-lg border ${outcome === 'YES' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                <span className="font-mono text-xs">
                  {staker.address.slice(0, 6)}...{staker.address.slice(-4)}
                </span>
                {address?.toLowerCase() === staker.address.toLowerCase() && (
                  <Badge variant="secondary" className="text-xs">You</Badge>
                )}
              </div>
              <Badge className={`text-xs ${outcome === 'YES' ? 'bg-green-600' : 'bg-red-600'}`}>
                {staker.sharePercentage.toFixed(2)}% share
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Staked</div>
                <div className="font-mono font-semibold">{formatUnits(staker.amount, 6)}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Weight</div>
                <div className="font-mono">{formatUnits(staker.weight, 18)}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Total Weight</div>
                <div className="font-mono">{formatUnits(totalWeight, 18)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPoolSummary = (bribes: BribePoolInfo[], outcome: 'YES' | 'NO') => {
    // Group by token
    const tokenGroups = bribes.reduce((acc, bribe) => {
      if (!acc[bribe.tokenSymbol]) {
        acc[bribe.tokenSymbol] = {
          symbol: bribe.tokenSymbol,
          decimals: bribe.tokenDecimals,
          totalAmount: 0n,
          userPending: 0n,
          count: 0,
        };
      }
      acc[bribe.tokenSymbol].totalAmount += bribe.totalAmount;
      acc[bribe.tokenSymbol].userPending += bribe.userPending;
      acc[bribe.tokenSymbol].count += 1;
      return acc;
    }, {} as Record<string, { symbol: string; decimals: number; totalAmount: bigint; userPending: bigint; count: number }>);

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-3 rounded-lg ${outcome === 'YES' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="text-xs text-muted-foreground mb-1">Total Pools</div>
          <div className="text-xl font-bold">{bribes.length}</div>
        </div>
        {Object.values(tokenGroups).map((token) => (
          <div key={token.symbol} className={`p-3 rounded-lg ${outcome === 'YES' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className="text-xs text-muted-foreground mb-1">{token.symbol} Rewards</div>
            <div className="text-sm font-semibold">{formatUnits(token.totalAmount, token.decimals)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{token.count} pool{token.count > 1 ? 's' : ''}</div>
          </div>
        ))}
        {address && Object.values(tokenGroups).some(t => t.userPending > 0n) && (
          <div className={`p-3 rounded-lg ${outcome === 'YES' ? 'bg-green-500/20 border-2 border-green-500/40' : 'bg-red-500/20 border-2 border-red-500/40'}`}>
            <div className="text-xs text-muted-foreground mb-1">You Can Claim</div>
            {Object.values(tokenGroups).map(token =>
              token.userPending > 0n ? (
                <div key={token.symbol} className={`text-sm font-bold ${outcome === 'YES' ? 'text-green-700' : 'text-red-700'}`}>
                  {formatUnits(token.userPending, token.decimals)} {token.symbol}
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          💡 Rewards are distributed based on your voting weight (stake × lock duration).
          The longer you lock, the more weight you have, and the larger your share of rewards.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="yes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="yes">
            ✓ YES Pool ({yesBribes.length} pool{yesBribes.length !== 1 ? 's' : ''})
          </TabsTrigger>
          <TabsTrigger value="no">
            ❌ NO Pool ({noBribes.length} pool{noBribes.length !== 1 ? 's' : ''})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="yes" className="space-y-4 mt-6">
          {/* REWARD Release Curve for YES */}
          {yesRewardPools.length > 0 && (
            <RewardReleaseChart
              rewardPools={yesRewardPools}
              tokenSymbol="REWARD (YES)"
              marketEndTime={BigInt(market.endTime)}
            />
          )}

          {/* 1. Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">💰 Pool Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {renderPoolSummary(yesBribes, 'YES')}
            </CardContent>
          </Card>

          {/* 2. Your Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📊 Your Position</CardTitle>
              <CardDescription className="text-xs">
                Your share determines how much you earn from all YES rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStakerRanking(yesTopStakers, yesTotalWeight, 'YES')}
            </CardContent>
          </Card>

          {/* 3. All Pools */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">🎁 All Reward Pools</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {yesBribes.length} active pool{yesBribes.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                {address && yesBribes.some(b => b.userPending > 0n) && (
                  <Button
                    onClick={() => handleClaimAll(1)}
                    disabled={isPending || isConfirming}
                    size="sm"
                  >
                    {isPending || isConfirming ? 'Claiming...' : 'Claim All'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {renderBribeList(yesBribes, 'YES')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="no" className="space-y-4 mt-6">
          {/* REWARD Release Curve for NO */}
          {noRewardPools.length > 0 && (
            <RewardReleaseChart
              rewardPools={noRewardPools}
              tokenSymbol="REWARD (NO)"
              marketEndTime={BigInt(market.endTime)}
            />
          )}

          {/* 1. Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">💰 Pool Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {renderPoolSummary(noBribes, 'NO')}
            </CardContent>
          </Card>

          {/* 2. Your Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📊 Your Position</CardTitle>
              <CardDescription className="text-xs">
                Your share determines how much you earn from all NO rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStakerRanking(noTopStakers, noTotalWeight, 'NO')}
            </CardContent>
          </Card>

          {/* 3. All Pools */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">🎁 All Reward Pools</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {noBribes.length} active pool{noBribes.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                {address && noBribes.some(b => b.userPending > 0n) && (
                  <Button
                    onClick={() => handleClaimAll(0)}
                    disabled={isPending || isConfirming}
                    variant="destructive"
                    size="sm"
                  >
                    {isPending || isConfirming ? 'Claiming...' : 'Claim All'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {renderBribeList(noBribes, 'NO')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
