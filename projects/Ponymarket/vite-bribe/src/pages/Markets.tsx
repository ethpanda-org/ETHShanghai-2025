import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { contracts } from '../config/contracts';
import MockCTF from '../contracts/MockCTF.json';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export default function Markets() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [userPositions, setUserPositions] = useState<Record<string, { yes: bigint; no: bigint }>>({});
  const [marketStats, setMarketStats] = useState<Record<string, { yesPrice: bigint; noPrice: bigint }>>({});

  // Create market states
  const [question, setQuestion] = useState('');
  const [initialPrice, setInitialPrice] = useState('50');
  const [endTime, setEndTime] = useState(() => {
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    return thirtyDaysLater.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  });

  // Create market dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCreateMarket = async () => {
    if (!question || !address) return;

    try {
      // Convert string to hex bytes32
      const encoder = new TextEncoder();
      const data = encoder.encode(question);
      const hex = Array.from(data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .padEnd(64, '0');
      const questionId = `0x${hex}` as `0x${string}`;

      // Convert percentage (0-100) to wei (0-1 ether)
      const priceInWei = (BigInt(initialPrice) * BigInt(10 ** 18)) / 100n;

      // Convert end time to Unix timestamp
      const startTime = 0n; // 0 = use current block timestamp
      const endTimeUnix = BigInt(Math.floor(new Date(endTime).getTime() / 1000));

      writeContract({
        address: contracts.mockCTF,
        abi: MockCTF.abi,
        functionName: 'prepareCondition',
        args: [address as `0x${string}`, questionId, 2n, priceInWei, startTime, endTimeUnix],
      });
    } catch (error) {
      console.error('Create market failed:', error);
    }
  };



  // Fetch markets from backend
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('http://localhost:3000/markets');
        const data = await response.json();
        setMarkets(data);
      } catch (error) {
        console.error('Failed to fetch markets:', error);
      }
    };

    fetchMarkets();
    // Refetch when transaction succeeds
    if (isSuccess) {
      setTimeout(fetchMarkets, 2000);
    }
  }, [isSuccess]);

  // Fetch user positions for all markets
  useEffect(() => {
    const fetchPositions = async () => {
      if (!address || !publicClient || markets.length === 0) return;

      const positions: Record<string, { yes: bigint; no: bigint }> = {};

      for (const market of markets) {
        try {
          // Use publicClient.readContract to call getUserPosition
          const result = await publicClient.readContract({
            address: contracts.mockCTF,
            abi: MockCTF.abi,
            functionName: 'getUserPosition',
            args: [market.conditionId as `0x${string}`, address],
          }) as [bigint, bigint];

          positions[market.conditionId] = { yes: result[0], no: result[1] };
        } catch (error) {
          console.error('Failed to fetch position for market:', market.conditionId, error);
        }
      }

      setUserPositions(positions);
    };

    fetchPositions();
  }, [address, publicClient, markets]);

  // Fetch market prices
  useEffect(() => {
    const fetchMarketStats = async () => {
      if (!publicClient || markets.length === 0) return;

      const stats: Record<string, { yesPrice: bigint; noPrice: bigint }> = {};

      for (const market of markets) {
        try {
          const result = await publicClient.readContract({
            address: contracts.mockCTF,
            abi: MockCTF.abi,
            functionName: 'getPrices',
            args: [market.conditionId as `0x${string}`],
          }) as [bigint, bigint];

          stats[market.conditionId] = { yesPrice: result[0], noPrice: result[1] };
        } catch (error) {
          console.error('Failed to fetch prices for market:', market.conditionId, error);
        }
      }

      setMarketStats(stats);
    };

    fetchMarketStats();
  }, [publicClient, markets]);

  // Decode questionId to readable text
  const decodeQuestionId = (hex: string) => {
    try {
      const cleanHex = hex.replace('0x', '').replace(/0+$/, '');
      const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      return new TextDecoder().decode(bytes);
    } catch {
      return hex.slice(0, 20) + '...';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">📊 Prediction Markets</h1>
        <p className="text-muted-foreground">Create and trade binary outcome markets</p>
      </div>

      {!isConnected ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg text-muted-foreground">Connect your wallet to view and trade markets</p>
              <ConnectButton />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Create Market Button */}
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            + Create New Market
          </Button>

          {/* Create Market Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Market</DialogTitle>
                <DialogDescription>Start a new binary prediction market</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., Will ETH reach $10k by 2025?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialPrice">Initial YES Price (%)</Label>
                  <Input
                    id="initialPrice"
                    type="number"
                    value={initialPrice}
                    onChange={(e) => setInitialPrice(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">Market End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Market will close at: {new Date(endTime).toLocaleString()}
                  </p>
                </div>

                <Button
                  onClick={handleCreateMarket}
                  disabled={isPending || isConfirming || !question}
                  size="lg"
                  className="w-full"
                >
                  {isPending ? 'Confirming...' : isConfirming ? 'Creating...' : 'Create Market'}
                </Button>

                {isSuccess && (
                  <Alert>
                    <AlertDescription>✅ Transaction successful!</AlertDescription>
                  </Alert>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Market List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">📋 All Markets</h2>
              <Badge variant="secondary">{markets.length} markets</Badge>
            </div>

            {markets.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No markets created yet. Create one above!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {markets.map((market) => (
                  <Card
                    key={market.conditionId}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/markets/${market.conditionId}`)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-2">{decodeQuestionId(market.questionId)}</CardTitle>
                      <CardDescription className="flex items-center justify-between">
                        <span>Block #{market.blockNumber}</span>
                        {userPositions[market.conditionId] && (
                          <Badge variant="secondary" className="ml-2">Has Position</Badge>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Market Prices - Progress Bar Style */}
                      {marketStats[market.conditionId] && (() => {
                        const yesPercent = (Number(marketStats[market.conditionId].yesPrice) / 1e18) * 100;
                        const noPercent = (Number(marketStats[market.conditionId].noPrice) / 1e18) * 100;
                        return (
                          <div className="space-y-2">
                            {/* Progress bar */}
                            <div className="flex h-10 rounded-lg overflow-hidden">
                              <div
                                className="bg-green-500 flex items-center justify-center text-white font-bold text-sm"
                                style={{ width: `${yesPercent}%` }}
                              >
                                {yesPercent >= 20 && `${yesPercent.toFixed(1)}%`}
                              </div>
                              <div
                                className="bg-red-500 flex items-center justify-center text-white font-bold text-sm"
                                style={{ width: `${noPercent}%` }}
                              >
                                {noPercent >= 20 && `${noPercent.toFixed(1)}%`}
                              </div>
                            </div>
                            {/* Labels */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>YES {yesPercent.toFixed(1)}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>NO {noPercent.toFixed(1)}%</span>
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* User Position - Compact */}
                      {userPositions[market.conditionId] && (
                        <div className="flex items-center gap-3 text-sm p-2 bg-muted rounded">
                          <div className="flex items-center gap-1">
                            <Badge variant="default" className="bg-green-500 h-5 px-2 text-xs">YOUR YES</Badge>
                            <span className="font-mono">{formatUnits(userPositions[market.conditionId].yes, 6)}</span>
                          </div>
                          <Separator orientation="vertical" className="h-4" />
                          <div className="flex items-center gap-1">
                            <Badge variant="destructive" className="h-5 px-2 text-xs">YOUR NO</Badge>
                            <span className="font-mono">{formatUnits(userPositions[market.conditionId].no, 6)}</span>
                          </div>
                        </div>
                      )}

                      {/* Click to view details hint */}
                      <div className="text-sm text-muted-foreground text-center pt-2">
                        Click to trade & view details →
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>📝 How to use</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Create a market with a question</li>
                <li>Click "Trade" on any market</li>
                <li>Choose YES or NO and enter amount</li>
                <li>Click the button to approve USDC (first time) then buy</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
