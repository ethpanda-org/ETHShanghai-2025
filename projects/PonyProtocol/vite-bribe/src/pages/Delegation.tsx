import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { contracts } from '../config/contracts';
import MockCTF from '../contracts/MockCTF.json';
import PonyProtocol from '../contracts/PonyProtocol.json';
import { parseUnits, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export default function Delegation() {
  const { conditionId } = useParams<{ conditionId?: string }>();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState<Market[]>([]);

  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<0 | 1>(1);
  const [depositAmount, setDepositAmount] = useState('100');
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [delegatedBalance, setDelegatedBalance] = useState<bigint>(0n);
  const [pendingRewards, setPendingRewards] = useState<bigint>(0n);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: ctfAllowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.mockCTF,
    abi: MockCTF.abi,
    functionName: 'isApprovedForAll',
    args: address ? [address, contracts.ponyProtocol] : undefined,
  });

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('http://localhost:3000/markets');
        const data = await response.json();
        setMarkets(data);

        // If conditionId from URL exists, use it; otherwise use first market
        if (conditionId) {
          setSelectedMarketId(conditionId);
        } else if (data.length > 0 && !selectedMarketId) {
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
  }, [isSuccess, conditionId]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicClient || !address || !selectedMarketId) return;

      try {
        const tokenId = await publicClient.readContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'getTokenId',
          args: [selectedMarketId as `0x${string}`, BigInt(selectedOutcome)],
        });

        const balance = await publicClient.readContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'balanceOf',
          args: [address, tokenId],
        });
        setTokenBalance(balance as bigint);

        const ponyTokenId = BigInt(selectedMarketId) + BigInt(selectedOutcome);
        const ponyBal = await publicClient.readContract({
          address: contracts.ponyProtocol,
          abi: PonyProtocol.abi,
          functionName: 'balanceOf',
          args: [address, ponyTokenId],
        });
        setDelegatedBalance(ponyBal as bigint);

        const pending = await publicClient.readContract({
          address: contracts.ponyProtocol,
          abi: PonyProtocol.abi,
          functionName: 'pendingBribes',
          args: [ponyTokenId, address],
        });
        setPendingRewards(pending as bigint);
      } catch (error) {
        console.error('Failed to fetch balances:', error);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 3000);
    return () => clearInterval(interval);
  }, [publicClient, address, selectedMarketId, selectedOutcome, isSuccess]);

  const handleApprove = () => {
    writeContract({
      address: contracts.mockCTF,
      abi: MockCTF.abi,
      functionName: 'setApprovalForAll',
      args: [contracts.ponyProtocol, true],
    });
  };

  const handleDeposit = () => {
    if (!selectedMarketId) return;
    const amount = parseUnits(depositAmount, 6);

    writeContract({
      address: contracts.ponyProtocol,
      abi: PonyProtocol.abi,
      functionName: 'deposit',
      args: [selectedMarketId as `0x${string}`, selectedOutcome, amount],
    });
  };

  const handleHarvest = () => {
    if (!selectedMarketId) return;
    const ponyTokenId = BigInt(selectedMarketId) + BigInt(selectedOutcome);

    writeContract({
      address: contracts.ponyProtocol,
      abi: PonyProtocol.abi,
      functionName: 'harvestAndClaimBribes',
      args: [ponyTokenId],
    });
  };

  const handleClaim = () => {
    if (!selectedMarketId) return;
    const ponyTokenId = BigInt(selectedMarketId) + BigInt(selectedOutcome);

    writeContract({
      address: contracts.ponyProtocol,
      abi: PonyProtocol.abi,
      functionName: 'claimBribes',
      args: [ponyTokenId],
    });
  };

  const needsApproval = !ctfAllowance;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🤝 Delegation</h1>
        <p className="text-muted-foreground">
          Liquid delegation for prediction market positions. Delegate your votes, receive tradeable pCTF tokens, and earn rewards effortlessly.
        </p>
      </div>

      {/* Explainer Card */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 How Delegation Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                Delegate & Lock
              </h3>
              <p className="text-sm text-muted-foreground">
                When you delegate your CTF tokens, they are <strong>permanently locked</strong> in the staking contract. In return, you receive <strong>pCTF tokens</strong> (1:1 ratio) representing your delegated position.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                Earn Rewards Passively
              </h3>
              <p className="text-sm text-muted-foreground">
                The protocol automatically harvests bribes for your position, preventing reward decay. You earn rewards without any manual intervention - just hold pCTF tokens.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                Trade for Liquidity
              </h3>
              <p className="text-sm text-muted-foreground">
                <strong>pCTF tokens are tradeable ERC1155 tokens.</strong> Sell them on secondary markets anytime to unlock liquidity, without waiting for the market to resolve or losing future rewards.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">4</span>
                Claim Your Share
              </h3>
              <p className="text-sm text-muted-foreground">
                Accumulated rewards are distributed proportionally to pCTF holders. Claim your earnings anytime - your share grows automatically as new bribes are added.
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>🔑 Key Benefits:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                <li><strong>Liquidity unlock:</strong> Sell pCTF tokens instead of waiting for market resolution</li>
                <li><strong>No reward decay:</strong> Protocol auto-harvests to maximize your returns</li>
                <li><strong>Composability:</strong> Use pCTF tokens as collateral in DeFi protocols</li>
                <li><strong>Set and forget:</strong> Earn rewards passively without manual management</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {!isConnected ? (
        <Alert>
          <AlertDescription>Please connect your wallet to use Delegation</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Deposit Card */}
          <Card>
            <CardHeader>
              <CardTitle>Delegate & Mint pCTF</CardTitle>
              <CardDescription>
                Lock CTF tokens permanently and receive tradeable pCTF tokens (1:1 ratio)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Market</Label>
                <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map((market) => (
                      <SelectItem key={market.conditionId} value={market.conditionId}>
                        Market {market.conditionId.slice(0, 8)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Outcome</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={selectedOutcome === 0 ? 'default' : 'outline'}
                    onClick={() => setSelectedOutcome(0)}
                    className="flex-1"
                  >
                    NO
                  </Button>
                  <Button
                    variant={selectedOutcome === 1 ? 'default' : 'outline'}
                    onClick={() => setSelectedOutcome(1)}
                    className="flex-1"
                  >
                    YES
                  </Button>
                </div>
              </div>

              <div>
                <Label>Amount (USDC)</Label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="100"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Balance: {formatUnits(tokenBalance, 6)} CTF tokens
                </p>
              </div>

              {needsApproval ? (
                <Button onClick={handleApprove} disabled={isPending || isConfirming} className="w-full">
                  {isPending || isConfirming ? 'Approving...' : 'Approve CTF Tokens'}
                </Button>
              ) : (
                <Button onClick={handleDeposit} disabled={isPending || isConfirming} className="w-full">
                  {isPending || isConfirming ? 'Delegating...' : 'Delegate & Mint pCTF'}
                </Button>
              )}

              <Alert className="mt-4">
                <AlertDescription className="text-xs">
                  ⚠️ <strong>Permanent Lock:</strong> Delegated CTF tokens cannot be withdrawn. You'll receive pCTF tokens which can be traded on secondary markets.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Rewards Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your pCTF Position</CardTitle>
              <CardDescription>
                Manage your pCTF tokens and claim accumulated rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">pCTF Balance:</span>
                  <div className="text-right">
                    <div className="font-mono font-bold">{formatUnits(delegatedBalance, 6)}</div>
                    <div className="text-xs text-muted-foreground">Tradeable ERC1155</div>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Rewards:</span>
                  <div className="text-right">
                    <div className="font-mono font-bold text-green-600">
                      {formatUnits(pendingRewards, 6)} USDC
                    </div>
                    <div className="text-xs text-muted-foreground">Auto-harvested</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={handleHarvest} disabled={isPending || isConfirming} className="w-full">
                  Harvest & Claim Rewards
                </Button>
                <Button onClick={handleClaim} disabled={isPending || isConfirming} variant="outline" className="w-full">
                  Claim Rewards Only
                </Button>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>💡 Why hold pCTF tokens?</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Passive income:</strong> Earn rewards without manual harvesting</li>
                    <li><strong>Exit anytime:</strong> Sell pCTF on markets to unlock liquidity instantly</li>
                    <li><strong>No decay:</strong> Protocol manages harvesting to prevent reward loss</li>
                    <li><strong>Portable value:</strong> Transfer or use pCTF in other DeFi protocols</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
