import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { contracts } from '../config/contracts';
import BribeManager from '../contracts/BribeManager.json';
import MockERC20 from '../contracts/MockERC20.json';
import { parseUnits, formatUnits } from 'viem';
import { simulateContract } from 'viem/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  totalAmount: bigint;
  startTime: bigint;
  endTime: bigint;
  conditionId: string;
  outcome: number;
}

export default function Bribes() {
  const { address, isConnected } = useAccount();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [marketBribes, setMarketBribes] = useState<Record<string, BribePool[]>>({});

  // Form state
  const [outcome, setOutcome] = useState<'0' | '1'>('1');
  const [amount, setAmount] = useState('1000');
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  // Read user's REWARD token balance
  const { data: rewardBalance } = useReadContract({
    address: contracts.rewardToken,
    abi: MockERC20.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read user's allowance for BribeManager
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.rewardToken,
    abi: MockERC20.abi,
    functionName: 'allowance',
    args: address ? [address, contracts.bribeManager] : undefined,
  });

  // Refetch allowance after transaction confirms
  useEffect(() => {
    if (isSuccess) {
      refetchAllowance();
    }
  }, [isSuccess, refetchAllowance]);

  // Fetch markets from backend
  useEffect(() => {
    fetch('http://localhost:3000/markets')
      .then((res) => res.json())
      .then((data) => setMarkets(data))
      .catch((err) => console.error('Failed to fetch markets:', err));
  }, [isSuccess]);

  // Fetch bribe pools for each market
  useEffect(() => {
    const fetchBribes = async () => {
      if (markets.length === 0) return;

      const bribesMap: Record<string, BribePool[]> = {};

      for (const market of markets) {
        const marketKey = `${market.conditionId}`;
        bribesMap[marketKey] = [];

        // Fetch bribes for both YES and NO outcomes
        for (const outcome of [0, 1]) {
          try {
            const response = await fetch(
              `http://localhost:3000/bribes/${market.conditionId}/${outcome}`
            );
            if (response.ok) {
              const data = await response.json();
              bribesMap[marketKey].push(...data);
            }
          } catch (error) {
            console.error('Failed to fetch bribes:', error);
          }
        }
      }

      setMarketBribes(bribesMap);
    };

    fetchBribes();
  }, [markets, isSuccess]);

  // Decode questionId to readable text
  const decodeQuestionId = (hex: string) => {
    try {
      const cleanHex = hex.replace('0x', '').replace(/0+$/, '');
      const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      return new TextDecoder().decode(bytes);
    } catch {
      return 'Unknown Market';
    }
  };

  const handleOpenDialog = (market: Market) => {
    setSelectedMarket(market);
    setDialogOpen(true);
  };

  const handleCreateBribe = async () => {
    if (!address || !selectedMarket || !startDate || !endDate || !publicClient) return;

    const amountBigInt = parseUnits(amount, 18);
    const currentAllowance = (allowance as bigint) || 0n;

    // Check if we need to approve first
    if (currentAllowance < amountBigInt) {
      console.log('⚠️ Insufficient allowance, need to approve first');
      try {
        writeContract({
          address: contracts.rewardToken,
          abi: MockERC20.abi,
          functionName: 'approve',
          args: [contracts.bribeManager, amountBigInt],
        });
        return; // Wait for approval tx to complete
      } catch (error) {
        console.error('Approve failed:', error);
        return;
      }
    }

    // Calculate timestamps at execution time
    const startTime = BigInt(Math.floor(startDate.getTime() / 1000));
    const endTime = BigInt(Math.floor(endDate.getTime() / 1000));

    // Simulate the transaction before sending
    console.log('🔍 Simulating transaction...');
    try {
      const { request } = await simulateContract(publicClient, {
        address: contracts.bribeManager,
        abi: BribeManager.abi,
        functionName: 'createBribePool',
        args: [
          selectedMarket.conditionId as `0x${string}`,
          parseInt(outcome),
          contracts.rewardToken,
          amountBigInt,
          startTime,
          endTime,
        ],
        account: address,
      });

      console.log('✅ Simulation successful, sending transaction...');
      writeContract(request);
    } catch (error: any) {
      console.error('❌ Simulation failed:', error);
      alert(`Cannot create bribe: ${error.shortMessage || error.message || 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2>🎁 Bribe Pool Manager</h2>
        <p style={{ color: '#666' }}>Create incentives for voters using custom ERC20 tokens</p>
      </div>

      {!isConnected ? (
        <Card>
          <CardContent className="pt-6">
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem' }}>Connect your wallet to create bribe pools</p>
              <ConnectButton />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          {/* Balance Display */}
          <Alert style={{ marginBottom: '2rem' }}>
            <AlertDescription>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Your REWARD Balance:</strong>{' '}
                  {rewardBalance ? formatUnits(rewardBalance as bigint, 18) : '0'} REWARD
                </div>
                <a href="/faucet" style={{ color: '#646cff' }}>Get More →</a>
              </div>
            </AlertDescription>
          </Alert>

          {/* Markets List */}
          <h3 style={{ marginBottom: '1rem' }}>Available Markets</h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {markets.map((market) => {
              const questionText = decodeQuestionId(market.questionId);
              const endTime = new Date(parseInt(market.endTime) * 1000);
              const isActive = endTime > new Date();

              return (
                <Card key={market.conditionId}>
                  <CardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <CardTitle style={{ fontSize: '1rem', flex: 1 }}>
                        {questionText}
                      </CardTitle>
                      <Badge variant={isActive ? 'default' : 'secondary'} style={{ marginLeft: '0.5rem' }}>
                        {isActive ? 'Active' : 'Ended'}
                      </Badge>
                    </div>
                    <CardDescription style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      Ends: {endTime.toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Dialog open={dialogOpen && selectedMarket?.conditionId === market.conditionId} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) setSelectedMarket(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => handleOpenDialog(market)}
                          disabled={!isActive}
                          style={{ width: '100%' }}
                        >
                          Create Bribe
                        </Button>
                      </DialogTrigger>
                      <DialogContent style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
                        <DialogHeader>
                          <DialogTitle>Create Bribe Pool</DialogTitle>
                          <DialogDescription>
                            {questionText}
                          </DialogDescription>
                        </DialogHeader>

                        <div style={{ marginTop: '1rem' }}>
                          {/* Outcome Selection */}
                          <div style={{ marginBottom: '1rem' }}>
                            <Label>Outcome</Label>
                            <Select value={outcome} onValueChange={(val) => setOutcome(val as '0' | '1')}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">YES</SelectItem>
                                <SelectItem value="0">NO</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Amount */}
                          <div style={{ marginBottom: '1rem' }}>
                            <Label>Amount (REWARD tokens)</Label>
                            <Input
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="1000"
                            />
                          </div>

                          {/* Start Date */}
                          <div style={{ marginBottom: '1rem' }}>
                            <Label>Start Date</Label>
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              disabled={(date) => date < new Date()}
                              className="rounded-md border"
                            />
                          </div>

                          {/* End Date */}
                          <div style={{ marginBottom: '1.5rem' }}>
                            <Label>End Date</Label>
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              disabled={(date) => {
                                const marketEnd = new Date(parseInt(market.endTime) * 1000);
                                return date < (startDate || new Date()) || date > marketEnd;
                              }}
                              className="rounded-md border"
                            />
                            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                              Must be before market end: {new Date(parseInt(market.endTime) * 1000).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Action Button */}
                          <Button
                            onClick={handleCreateBribe}
                            disabled={isPending || isConfirming || !startDate || !endDate}
                            style={{ width: '100%' }}
                          >
                            {isPending || isConfirming ? 'Processing...' :
                              ((allowance as bigint) || 0n) < parseUnits(amount || '0', 18) ? 'Approve & Create Bribe' : 'Create Bribe'}
                          </Button>

                          {isSuccess && (
                            <Alert style={{ marginTop: '1rem' }}>
                              <AlertDescription>
                                ✅ Transaction successful!
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Show existing bribes for this market */}
                    {marketBribes[market.conditionId]?.length > 0 && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                          Active Bribes ({marketBribes[market.conditionId].length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {marketBribes[market.conditionId].map((bribe) => (
                            <div
                              key={bribe.id.toString()}
                              style={{
                                padding: '0.5rem',
                                background: '#f8f9fa',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <Badge variant={bribe.outcome === 1 ? 'default' : 'secondary'} style={{ fontSize: '0.65rem' }}>
                                  {bribe.outcome === 1 ? 'YES' : 'NO'}
                                </Badge>
                                <span style={{ fontWeight: '500' }}>
                                  {formatUnits(bribe.totalAmount, 18)} REWARD
                                </span>
                              </div>
                              <div style={{ color: '#666' }}>
                                Ends: {new Date(Number(bribe.endTime) * 1000).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                      ID: {market.conditionId.slice(0, 10)}...
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {markets.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p style={{ textAlign: 'center', color: '#666' }}>
                  No markets available. Create one in the Markets page.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <Alert>
              <AlertDescription>
                <p><strong>ℹ️ How it works:</strong></p>
                <ul style={{ fontSize: '0.85rem', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  <li>Bribes incentivize users to vote for a specific outcome</li>
                  <li>Rewards use quadratic curve (75% at 50% time)</li>
                  <li>Users claim based on their voting weight</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertDescription>
                <p><strong>⚠️ Important:</strong></p>
                <ul style={{ fontSize: '0.85rem', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  <li>Bribe end cannot exceed market end time</li>
                  <li>Approve tokens before creating bribe pool</li>
                  <li>Start date must be in the future</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
    </div>
  );
}
