import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { contracts } from '../config/contracts';
import MockCTF from '../contracts/MockCTF.json';
import MockERC20 from '../contracts/MockERC20.json';
import { parseUnits, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface TradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market: Market | null;
  userPosition?: { yes: bigint; no: bigint };
  decodeQuestionId: (hex: string) => string;
  onTradeSuccess?: () => void;
}

export function TradeDialog({ open, onOpenChange, market, userPosition, decodeQuestionId, onTradeSuccess }: TradeDialogProps) {
  const { address } = useAccount();
  const [buyAmount, setBuyAmount] = useState('100');
  const [buyType, setBuyType] = useState<'yes' | 'no'>('yes');
  const [isApproving, setIsApproving] = useState(false);
  const [processedHash, setProcessedHash] = useState<string | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contracts.mockUSDC,
    abi: MockERC20.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read USDC allowance for trading
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: contracts.mockUSDC,
    abi: MockERC20.abi,
    functionName: 'allowance',
    args: address ? [address, contracts.mockCTF] : undefined,
  });

  // Refetch allowance when transaction succeeds and call success callback
  useEffect(() => {
    // Only process if success and hash hasn't been processed yet
    if (isSuccess && hash && hash !== processedHash) {
      refetchAllowance();

      // Mark this hash as processed
      setProcessedHash(hash);

      // Only close dialog and refresh if it was a buy transaction (not approve)
      if (!isApproving && onTradeSuccess) {
        setTimeout(() => {
          onTradeSuccess();
          // Close dialog after successful trade
          onOpenChange(false);
        }, 1000); // Wait 1s for blockchain to confirm
      }

      // Reset approving flag
      setIsApproving(false);
    }
  }, [isSuccess, hash, processedHash, refetchAllowance, onTradeSuccess, onOpenChange, isApproving]);

  const handleBuyTokens = async () => {
    if (!market || !buyAmount) return;

    try {
      const amount = parseUnits(buyAmount, 6); // USDC has 6 decimals

      // Calculate required USDC cost
      const price = parseFloat(market.initialYesPrice) / 1e18 || 0.5;
      const cost = buyType === 'yes'
        ? (amount * BigInt(Math.floor(price * 100))) / 100n
        : (amount * BigInt(Math.floor((1 - price) * 100))) / 100n;

      // Check USDC balance
      const currentBalance = (usdcBalance as bigint) || 0n;
      if (currentBalance < cost) {
        alert(`Insufficient USDC balance. Need ${formatUnits(cost, 6)} USDC, but you have ${formatUnits(currentBalance, 6)} USDC. Please get USDC from the Faucet page.`);
        return;
      }

      // Check if allowance is sufficient
      const currentAllowance = (usdcAllowance as bigint) || 0n;
      if (currentAllowance < cost) {
        // Approve USDC instead of trading
        setIsApproving(true);
        writeContract({
          address: contracts.mockUSDC,
          abi: MockERC20.abi,
          functionName: 'approve',
          args: [contracts.mockCTF as `0x${string}`, parseUnits('1000000', 6)],
        });
        return;
      }

      // Call buy function with type-safe args
      if (buyType === 'yes') {
        writeContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'buyYes',
          args: [market.conditionId as `0x${string}`, amount],
        });
      } else {
        writeContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'buyNo',
          args: [market.conditionId as `0x${string}`, amount],
        });
      }
    } catch (error) {
      console.error('Buy tokens failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trade Market</DialogTitle>
          <DialogDescription>
            {market && decodeQuestionId(market.questionId)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tradeAmount">Amount (tokens)</Label>
            <Input
              id="tradeAmount"
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              placeholder="100"
            />
          </div>

          <div className="space-y-2">
            <Label>Select Outcome</Label>
            <Tabs value={buyType} onValueChange={(v) => setBuyType(v as 'yes' | 'no')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="yes">✅ YES</TabsTrigger>
                <TabsTrigger value="no">❌ NO</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {market && userPosition && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Your Current Position</p>
              <div className="flex gap-4 text-sm">
                <span>✅ YES: {formatUnits(userPosition.yes, 6)}</span>
                <span>❌ NO: {formatUnits(userPosition.no, 6)}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleBuyTokens}
            disabled={isPending || isConfirming || !market}
            className="w-full"
            size="lg"
          >
            {isPending ? 'Confirming...' : isConfirming ?
              ((usdcAllowance as bigint || 0n) < parseUnits(buyAmount || '0', 6) ? 'Approving...' : 'Buying...') :
              ((usdcAllowance as bigint || 0n) < parseUnits(buyAmount || '0', 6) ? 'Approve USDC' : `Buy ${buyType.toUpperCase()}`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
