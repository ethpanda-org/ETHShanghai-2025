import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { contracts } from '../config/contracts';
import PonyProtocol from '../contracts/PonyProtocol.json';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

export default function Trading() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [pctfBalances, setPctfBalances] = useState<Map<string, { yes: bigint; no: bigint }>>(new Map());

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
  }, []);

  useEffect(() => {
    const fetchPctfBalances = async () => {
      if (!publicClient || !address || markets.length === 0) return;

      const balances = new Map<string, { yes: bigint; no: bigint }>();

      for (const market of markets) {
        try {
          const yesTokenId = BigInt(market.conditionId) + BigInt(1);
          const noTokenId = BigInt(market.conditionId) + BigInt(0);

          const yesBal = await publicClient.readContract({
            address: contracts.ponyProtocol,
            abi: PonyProtocol.abi,
            functionName: 'balanceOf',
            args: [address, yesTokenId],
          });

          const noBal = await publicClient.readContract({
            address: contracts.ponyProtocol,
            abi: PonyProtocol.abi,
            functionName: 'balanceOf',
            args: [address, noTokenId],
          });

          balances.set(market.conditionId, {
            yes: yesBal as bigint,
            no: noBal as bigint,
          });
        } catch (error) {
          console.error(`Failed to fetch pCTF balance for market ${market.conditionId}:`, error);
        }
      }

      setPctfBalances(balances);
    };

    fetchPctfBalances();
    const interval = setInterval(fetchPctfBalances, 5000);
    return () => clearInterval(interval);
  }, [publicClient, address, markets]);

  const decodeQuestionId = (questionId: string): string => {
    try {
      const hex = questionId.startsWith('0x') ? questionId.slice(2) : questionId;
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
      return new TextDecoder().decode(bytes).replace(/\0/g, '');
    } catch {
      return questionId;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">💱 pCTF Trading Market</h1>
        <p className="text-muted-foreground">
          Trade your pCTF tokens to unlock liquidity without withdrawing votes. Transfer ownership rights while maintaining your position.
        </p>
      </div>

      {/* Explainer Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 About pCTF Trading
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                🔓 Unlock Liquidity
              </h3>
              <p className="text-sm text-muted-foreground">
                Sell your pCTF tokens on secondary markets to exit your position without waiting for market resolution. Your delegated CTF tokens remain permanently locked.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                🔄 Transfer Ownership
              </h3>
              <p className="text-sm text-muted-foreground">
                Trading pCTF tokens transfers the <strong>right to claim rewards</strong> from delegated positions. The underlying votes stay locked and cannot be withdrawn.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                📊 Price Discovery
              </h3>
              <p className="text-sm text-muted-foreground">
                pCTF token prices may differ from underlying CTF tokens based on liquidity, expected rewards, and market sentiment. Spreads vary by market depth.
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>⚠️ Important:</strong> pCTF tokens represent delegation rights, not the underlying CTF tokens themselves.
              Once CTF tokens are delegated, they are <strong>permanently locked</strong> in the staking contract.
              Trading pCTF only transfers reward claim rights - it does not unlock or withdraw the delegated votes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {!isConnected ? (
        <Alert>
          <AlertDescription>Please connect your wallet to view your pCTF positions</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Your pCTF Holdings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your pCTF Holdings</CardTitle>
              <CardDescription>
                Trade these tokens on secondary markets to unlock liquidity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {markets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No markets available</p>
              ) : (
                <div className="space-y-4">
                  {markets.map((market) => {
                    const balance = pctfBalances.get(market.conditionId);
                    const hasBalance = balance && (balance.yes > 0n || balance.no > 0n);

                    if (!hasBalance) return null;

                    return (
                      <Card key={market.conditionId}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">{decodeQuestionId(market.questionId)}</h3>
                              <p className="text-xs text-muted-foreground">
                                Market ID: {market.conditionId.slice(0, 10)}...{market.conditionId.slice(-8)}
                              </p>
                            </div>
                            <div className="flex items-center gap-6">
                              {balance && balance.yes > 0n && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="bg-green-500">YES pCTF</Badge>
                                  <span className="font-mono font-bold">{formatUnits(balance.yes, 6)}</span>
                                </div>
                              )}
                              {balance && balance.no > 0n && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="destructive">NO pCTF</Badge>
                                  <span className="font-mono font-bold">{formatUnits(balance.no, 6)}</span>
                                </div>
                              )}
                              <Button variant="outline" disabled>
                                Trade (Coming Soon)
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {Array.from(pctfBalances.values()).every(
                    (bal) => bal.yes === 0n && bal.no === 0n
                  ) && (
                    <p className="text-muted-foreground text-center py-8">
                      You don't have any pCTF tokens yet. Delegate your CTF tokens to mint pCTF.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trading Features (Coming Soon) */}
          <Card>
            <CardHeader>
              <CardTitle>🚀 Trading Features</CardTitle>
              <CardDescription>
                Secondary market trading coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Order Book Trading</h3>
                      <p className="text-sm text-muted-foreground">
                        Place limit orders to buy or sell pCTF tokens at your desired price
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Instant Swap</h3>
                      <p className="text-sm text-muted-foreground">
                        Quick swap at market price with automated market makers (AMM)
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Liquidity Pools</h3>
                      <p className="text-sm text-muted-foreground">
                        Provide liquidity for pCTF tokens and earn trading fees
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Price Charts</h3>
                      <p className="text-sm text-muted-foreground">
                        View historical price data and trading volume for each pCTF market
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      5
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Portfolio View</h3>
                      <p className="text-sm text-muted-foreground">
                        Track all your pCTF positions, pending rewards, and trade history
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      6
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Cross-Protocol Integration</h3>
                      <p className="text-sm text-muted-foreground">
                        Use pCTF as collateral in lending protocols and other DeFi applications
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Alert className="mt-6">
                <AlertDescription className="text-sm">
                  <strong>📢 Stay tuned:</strong> We're building a comprehensive secondary market for pCTF tokens.
                  In the meantime, you can transfer your ERC1155 pCTF tokens using standard NFT marketplaces or direct P2P transfers.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
