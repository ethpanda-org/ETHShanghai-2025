import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicClient } from 'wagmi';
import { contracts } from '../config/contracts';
import BribeManager from '../contracts/BribeManager.json';
import MockERC20 from '../contracts/MockERC20.json';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus } from 'lucide-react';

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

interface BribePool {
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
}

interface BribesTabProps {
  market: Market;
}

export function BribesTab({ market }: BribesTabProps) {
  const navigate = useNavigate();
  const publicClient = usePublicClient();
  const [yesBribes, setYesBribes] = useState<BribePool[]>([]);
  const [noBribes, setNoBribes] = useState<BribePool[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch bribes for this market
  useEffect(() => {
    const fetchBribes = async () => {
      if (!publicClient) return;

      setIsLoading(true);
      try {
        // Fetch YES bribes
        const yesBribeIds = await publicClient.readContract({
          address: contracts.bribeManager,
          abi: BribeManager.abi,
          functionName: 'getBribePoolsByMarket',
          args: [market.conditionId as `0x${string}`, 1],
        }) as bigint[];

        const yesBribesData: BribePool[] = [];
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
          });
        }
        setYesBribes(yesBribesData);

        // Fetch NO bribes
        const noBribeIds = await publicClient.readContract({
          address: contracts.bribeManager,
          abi: BribeManager.abi,
          functionName: 'getBribePoolsByMarket',
          args: [market.conditionId as `0x${string}`, 0],
        }) as bigint[];

        const noBribesData: BribePool[] = [];
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
          });
        }
        setNoBribes(noBribesData);
      } catch (error) {
        console.error('Failed to fetch bribes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBribes();
  }, [publicClient, market.conditionId]);

  const handleCreateBribe = () => {
    navigate(`/bribes/${market.conditionId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading bribes...</div>
      </div>
    );
  }

  const totalBribes = yesBribes.length + noBribes.length;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          💡 Bribes incentivize stakers to lock tokens in specific outcome pools.
          Anyone can create a bribe pool to attract voting weight to their preferred outcome.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Bribe Pools</CardTitle>
              <CardDescription className="mt-1">
                {totalBribes} active pool{totalBribes !== 1 ? 's' : ''} offering rewards for this market
              </CardDescription>
            </div>
            <Button onClick={handleCreateBribe} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Bribe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* YES Pools */}
            {yesBribes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-green-600">✓ YES</Badge>
                  <span className="text-sm text-muted-foreground">
                    {yesBribes.length} pool{yesBribes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {yesBribes.map((bribe) => (
                    <div
                      key={bribe.id.toString()}
                      className="p-3 rounded-lg border bg-green-500/5 border-green-500/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{bribe.tokenSymbol}</span>
                        <Badge variant="outline" className="text-xs">#{bribe.id.toString()}</Badge>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <div className="text-muted-foreground">Total Rewards</div>
                          <div className="font-mono font-semibold">
                            {formatUnits(bribe.totalAmount, bribe.tokenDecimals)} {bribe.tokenSymbol}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Sponsor</div>
                          <div className="font-mono text-xs">
                            {bribe.sponsor.slice(0, 6)}...{bribe.sponsor.slice(-4)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Duration</div>
                          <div>
                            {new Date(Number(bribe.startTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(Number(bribe.endTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NO Pools */}
            {noBribes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="destructive">❌ NO</Badge>
                  <span className="text-sm text-muted-foreground">
                    {noBribes.length} pool{noBribes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {noBribes.map((bribe) => (
                    <div
                      key={bribe.id.toString()}
                      className="p-3 rounded-lg border bg-red-500/5 border-red-500/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{bribe.tokenSymbol}</span>
                        <Badge variant="outline" className="text-xs">#{bribe.id.toString()}</Badge>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <div className="text-muted-foreground">Total Rewards</div>
                          <div className="font-mono font-semibold">
                            {formatUnits(bribe.totalAmount, bribe.tokenDecimals)} {bribe.tokenSymbol}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Sponsor</div>
                          <div className="font-mono text-xs">
                            {bribe.sponsor.slice(0, 6)}...{bribe.sponsor.slice(-4)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Duration</div>
                          <div>
                            {new Date(Number(bribe.startTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(Number(bribe.endTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalBribes === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No bribe pools created yet</p>
                <Button onClick={handleCreateBribe} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Be the first to create a bribe
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
