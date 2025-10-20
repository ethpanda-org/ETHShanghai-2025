import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient } from 'wagmi';
import { contracts } from '../config/contracts';
import MockCTF from '../contracts/MockCTF.json';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import { TradeDialog } from '@/components/TradeDialog';
import { BribesTab } from '@/components/BribesTab';
import { StakeTab } from '@/components/StakeTab';
import { RewardsTab } from '@/components/RewardsTab';

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

export default function MarketDetail() {
  const { conditionId } = useParams<{ conditionId: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [market, setMarket] = useState<Market | null>(null);
  const [userPositions, setUserPositions] = useState<{ yes: bigint; no: bigint }>({ yes: 0n, no: 0n });
  const [marketPrices, setMarketPrices] = useState<{ yesPrice: bigint; noPrice: bigint }>({ yesPrice: 0n, noPrice: 0n });
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Trade dialog state
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);

  // Fetch market details
  useEffect(() => {
    const fetchMarket = async () => {
      if (!conditionId) return;

      try {
        // Try to fetch single market from backend
        const response = await fetch(`http://localhost:3000/markets/${conditionId}`);
        if (response.ok) {
          const data = await response.json();
          setMarket(data);
        } else {
          // Fallback: fetch all markets and find the one
          const allResponse = await fetch('http://localhost:3000/markets');
          const allData = await allResponse.json();
          const foundMarket = allData.find((m: Market) => m.conditionId === conditionId);
          if (foundMarket) {
            setMarket(foundMarket);
          }
        }
      } catch (error) {
        console.error('Failed to fetch market:', error);
      }
    };

    fetchMarket();
  }, [conditionId]);

  // Fetch user positions (YES/NO token balance)
  const fetchPositions = async () => {
    if (!address || !publicClient || !conditionId) return;

    try {
      const result = await publicClient.readContract({
        address: contracts.mockCTF,
        abi: MockCTF.abi,
        functionName: 'getUserPosition',
        args: [conditionId as `0x${string}`, address],
      }) as [bigint, bigint];

      setUserPositions({ yes: result[0], no: result[1] });
    } catch (error) {
      console.error('Failed to fetch position for market:', error);
    }
  };

  // Callback for trade success - refetch positions and trigger balance refresh
  const handleTradeSuccess = () => {
    fetchPositions();
    setRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    fetchPositions();
  }, [address, publicClient, conditionId]);

  // Fetch market prices
  useEffect(() => {
    const fetchMarketPrices = async () => {
      if (!publicClient || !conditionId) return;

      try {
        const result = await publicClient.readContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'getPrices',
          args: [conditionId as `0x${string}`],
        }) as [bigint, bigint];

        setMarketPrices({ yesPrice: result[0], noPrice: result[1] });
      } catch (error) {
        console.error('Failed to fetch prices for market:', error);
      }
    };

    fetchMarketPrices();
  }, [publicClient, conditionId]);

  const decodeQuestionId = (hex: string) => {
    try {
      const cleanHex = hex.replace('0x', '').replace(/0+$/, '');
      const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      return new TextDecoder().decode(bytes);
    } catch {
      return hex.slice(0, 20) + '...';
    }
  };

  if (!market) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/markets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Markets
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading market...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/markets')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Markets
        </Button>
      </div>

      {/* Market Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{decodeQuestionId(market.questionId)}</CardTitle>
              <CardDescription>
                <div className="flex flex-wrap gap-4 mt-2">
                  <span>Block #{market.blockNumber}</span>
                  <span>•</span>
                  <span>Start: {market.startTime === '0' ? 'Now' : new Date(Number(market.startTime) * 1000).toLocaleString()}</span>
                  <span>•</span>
                  <span>End: {new Date(Number(market.endTime) * 1000).toLocaleString()}</span>
                </div>
              </CardDescription>

              {/* Market Prices Progress Bar */}
              {marketPrices.yesPrice > 0n && marketPrices.noPrice > 0n && (() => {
                const yesPercent = (Number(marketPrices.yesPrice) / 1e18) * 100;
                const noPercent = (Number(marketPrices.noPrice) / 1e18) * 100;
                return (
                  <div className="space-y-2 mt-4">
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
            </div>
          </div>
        </CardHeader>
        {isConnected && (
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button onClick={() => setTradeDialogOpen(true)} size="lg">
                  🎯 Trade
                </Button>
                <Button
                  onClick={() => navigate(`/delegation/${conditionId}`)}
                  size="lg"
                  variant="outline"
                >
                  🤝 Delegate
                </Button>
              </div>
              <div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500">YES</Badge>
                    <span className="font-mono text-lg">{formatUnits(userPositions.yes, 6)}</span>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">NO</Badge>
                    <span className="font-mono text-lg">{formatUnits(userPositions.no, 6)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Your outcome token holdings</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {!isConnected ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg text-muted-foreground">Connect your wallet to interact with this market</p>
              <ConnectButton />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="stake" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stake">💰 Stake</TabsTrigger>
            <TabsTrigger value="rewards">🎁 Rewards</TabsTrigger>
            <TabsTrigger value="bribes">💸 Bribes</TabsTrigger>
          </TabsList>

          <TabsContent value="stake">
            <StakeTab market={market} refetchTrigger={refetchTrigger} />
          </TabsContent>

          <TabsContent value="rewards">
            <RewardsTab market={market} />
          </TabsContent>

          <TabsContent value="bribes">
            <BribesTab market={market} />
          </TabsContent>
        </Tabs>
      )}

      {/* Trade Dialog */}
      <TradeDialog
        open={tradeDialogOpen}
        onOpenChange={setTradeDialogOpen}
        market={market}
        userPosition={userPositions}
        decodeQuestionId={decodeQuestionId}
        onTradeSuccess={handleTradeSuccess}
      />
    </div>
  );
}
