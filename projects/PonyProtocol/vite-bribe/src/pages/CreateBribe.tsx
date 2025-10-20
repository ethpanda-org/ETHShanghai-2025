import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { contracts } from '../config/contracts';
import BribeManager from '../contracts/BribeManager.json';
import MockERC20 from '../contracts/MockERC20.json';
import MockCTF from '../contracts/MockCTF.json';
import { parseUnits, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function CreateBribe() {
  const { conditionId } = useParams<{ conditionId: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [outcome, setOutcome] = useState<'0' | '1'>('1');
  const [tokenAddress, setTokenAddress] = useState<`0x${string}`>(contracts.rewardToken as `0x${string}`);
  const [amount, setAmount] = useState('1000');
  const [startOption, setStartOption] = useState<'now' | 'custom'>('now');
  const [customStartDate, setCustomStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read token balance
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: MockERC20.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read token allowance
  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: MockERC20.abi,
    functionName: 'allowance',
    args: address ? [address, contracts.bribeManager] : undefined,
  });

  // Read token info
  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: MockERC20.abi,
    functionName: 'symbol',
  });

  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: MockERC20.abi,
    functionName: 'decimals',
  });

  // Fetch market info
  useEffect(() => {
    const fetchMarketInfo = async () => {
      if (!publicClient || !conditionId) return;

      try {
        const condition = await publicClient.readContract({
          address: contracts.mockCTF,
          abi: MockCTF.abi,
          functionName: 'getCondition',
          args: [conditionId as `0x${string}`],
        }) as any;

        setMarketInfo({
          startTime: condition[4],
          endTime: condition[5],
        });

        // Set default end date
        const now = new Date();
        const marketEnd = new Date(Number(condition[5]) * 1000);
        const defaultEnd = new Date(Math.min(now.getTime() + 30 * 24 * 60 * 60 * 1000, marketEnd.getTime()));

        setEndDate(defaultEnd.toISOString().split('T')[0]);
      } catch (error) {
        console.error('Failed to fetch market info:', error);
      }
    };

    fetchMarketInfo();
  }, [publicClient, conditionId]);

  // Refresh allowance after any transaction success
  useEffect(() => {
    if (isSuccess) {
      refetchBalance();
      refetchAllowance();
    }
  }, [isSuccess, refetchBalance, refetchAllowance]);

  // Handle successful pool creation and redirect
  useEffect(() => {
    if (createSuccess) {
      setTimeout(() => {
        navigate(`/markets/${conditionId}`);
      }, 2000);
    }
  }, [createSuccess, navigate, conditionId]);

  const handleApprove = () => {
    if (!tokenDecimals || tokenDecimals === undefined) return;

    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: MockERC20.abi,
      functionName: 'approve',
      args: [contracts.bribeManager, parseUnits(amount, Number(tokenDecimals))],
    });
  };

  const handleCreateBribe = () => {
    if (!tokenDecimals || tokenDecimals === undefined || !endDate) return;

    // Validate custom start date if selected
    if (startOption === 'custom' && !customStartDate) {
      alert('Please select a start date');
      return;
    }

    // Generate start timestamp at button click time
    let startTimestamp: number;
    if (startOption === 'now') {
      // Start in 3 minutes from now to allow for signing and transaction confirmation
      const nowInSeconds = Math.floor(Date.now() / 1000);
      startTimestamp = nowInSeconds + 180; // 180 seconds = 3 minutes
    } else {
      // Use custom date (set to start of day)
      startTimestamp = Math.floor(new Date(customStartDate).getTime() / 1000);
    }

    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    writeContract(
      {
        address: contracts.bribeManager,
        abi: BribeManager.abi,
        functionName: 'createBribePool',
        args: [
          conditionId as `0x${string}`,
          Number(outcome),
          tokenAddress as `0x${string}`,
          parseUnits(amount, Number(tokenDecimals)),
          BigInt(startTimestamp),
          BigInt(endTimestamp),
        ],
      },
      {
        onSuccess: () => {
          setCreateSuccess(true);
        },
      }
    );
  };

  const needsApproval = tokenAllowance !== undefined && tokenAllowance !== null && tokenDecimals !== undefined &&
    (tokenAllowance as bigint) < parseUnits(amount, Number(tokenDecimals));

  // Calculate release curve data points for preview
  const curveData = useMemo(() => {
    if (!endDate || !amount) return [];

    // Determine start time based on selected option
    let startTime: number;
    if (startOption === 'now') {
      // Preview assumes starting now + 3 minutes
      startTime = Date.now() + 180 * 1000;
    } else {
      if (!customStartDate) return [];
      startTime = new Date(customStartDate).getTime();
    }

    const endTime = new Date(endDate).getTime();
    const duration = endTime - startTime;

    if (duration <= 0) return [];

    const points = [];
    const numPoints = 50; // Number of points to plot

    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints;
      const timestamp = startTime + (duration * progress);

      // Quadratic release curve: sqrt(progress)
      // At 50% time elapsed, 75% of rewards are released
      const releasedPercentage = Math.sqrt(progress) * 100;

      points.push({
        date: new Date(timestamp),
        percentage: releasedPercentage,
        amount: (parseFloat(amount) * releasedPercentage) / 100,
      });
    }

    return points;
  }, [startOption, customStartDate, endDate, amount]);

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(`/markets/${conditionId}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Market
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Create Bribe Pool</h1>
          <p className="text-muted-foreground">
            Incentivize stakers to lock tokens in your preferred outcome by offering rewards
          </p>
        </div>

        <Alert>
          <AlertDescription>
            <strong>How it works:</strong> You deposit reward tokens that will be distributed to stakers
            based on their voting weight. The more they stake and the longer they lock, the more they earn.
            Rewards are released using a quadratic curve (early-heavy distribution).
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Bribe Configuration</CardTitle>
            <CardDescription>
              Set up your reward pool to attract voting weight
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Outcome Selection */}
            <div className="space-y-3">
              <Label>Target Outcome</Label>
              <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as '0' | '1')}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                  <RadioGroupItem value="1" id="yes" />
                  <Label htmlFor="yes" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600">✓ YES</Badge>
                      <span className="text-sm">Incentivize YES voters</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border bg-red-500/5 border-red-500/20">
                  <RadioGroupItem value="0" id="no" />
                  <Label htmlFor="no" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">❌ NO</Badge>
                      <span className="text-sm">Incentivize NO voters</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Token Selection */}
            <div className="space-y-2">
              <Label htmlFor="token">Reward Token</Label>
              <div className="flex gap-2">
                <Input
                  id="token"
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value as `0x${string}`)}
                  placeholder="0x..."
                />
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md min-w-[100px]">
                  <span className="text-sm font-semibold">{String(tokenSymbol || 'Unknown')}</span>
                </div>
              </div>
              {address && tokenBalance !== undefined && tokenDecimals !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Your balance: {formatUnits(tokenBalance as bigint, Number(tokenDecimals))} {String(tokenSymbol)}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Total Reward Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
              />
              <p className="text-xs text-muted-foreground">
                Total tokens to distribute to stakers over the duration
              </p>
            </div>

            {/* Start Time Option */}
            <div className="space-y-3">
              <Label>Start Time</Label>
              <RadioGroup value={startOption} onValueChange={(v) => setStartOption(v as 'now' | 'custom')}>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="now" id="start-now" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="start-now" className="font-normal cursor-pointer">
                      Start Immediately
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rewards begin 3 minutes after transaction confirms (allows time for signing)
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="custom" id="start-custom" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="start-custom" className="font-normal cursor-pointer">
                      Schedule for Later
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {startOption === 'custom' && (
                <div className="ml-6 space-y-2">
                  <Input
                    id="customStartDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Rewards will start at the beginning of this day (00:00:00 UTC)
                  </p>
                </div>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startOption === 'custom' ? customStartDate : new Date().toISOString().split('T')[0]}
                max={marketInfo ? new Date(Number(marketInfo.endTime) * 1000).toISOString().split('T')[0] : undefined}
              />
              <p className="text-xs text-muted-foreground">
                When rewards stop distributing (must be before market end)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Release Curve Visualization */}
        {curveData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📈 Reward Release Curve</CardTitle>
              <CardDescription>
                Visual representation of how rewards are distributed over time (quadratic curve)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">At 25% Time</div>
                    <div className="text-lg font-bold">50% Released</div>
                    <div className="text-xs text-muted-foreground">
                      {(parseFloat(amount) * 0.5).toFixed(2)} {String(tokenSymbol)}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">At 50% Time</div>
                    <div className="text-lg font-bold">71% Released</div>
                    <div className="text-xs text-muted-foreground">
                      {(parseFloat(amount) * 0.71).toFixed(2)} {String(tokenSymbol)}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">At 75% Time</div>
                    <div className="text-lg font-bold">87% Released</div>
                    <div className="text-xs text-muted-foreground">
                      {(parseFloat(amount) * 0.87).toFixed(2)} {String(tokenSymbol)}
                    </div>
                  </div>
                </div>

                {/* SVG Chart */}
                <div className="w-full" style={{ height: '300px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet">
                    {/* Grid lines */}
                    <g stroke="#e5e7eb" strokeWidth="1" opacity="0.3">
                      {[0, 25, 50, 75, 100].map((y) => (
                        <line
                          key={`h-${y}`}
                          x1="50"
                          y1={250 - (y * 2)}
                          x2="580"
                          y2={250 - (y * 2)}
                          strokeDasharray="4 4"
                        />
                      ))}
                      {[0, 25, 50, 75, 100].map((x) => (
                        <line
                          key={`v-${x}`}
                          x1={50 + (x * 5.3)}
                          y1="50"
                          x2={50 + (x * 5.3)}
                          y2="250"
                          strokeDasharray="4 4"
                        />
                      ))}
                    </g>

                    {/* Axes */}
                    <line x1="50" y1="250" x2="580" y2="250" stroke="#64748b" strokeWidth="2" />
                    <line x1="50" y1="50" x2="50" y2="250" stroke="#64748b" strokeWidth="2" />

                    {/* Y-axis labels */}
                    <g fill="#64748b" fontSize="12" textAnchor="end">
                      <text x="45" y="254">0%</text>
                      <text x="45" y="204">25%</text>
                      <text x="45" y="154">50%</text>
                      <text x="45" y="104">75%</text>
                      <text x="45" y="54">100%</text>
                    </g>

                    {/* X-axis labels */}
                    <g fill="#64748b" fontSize="12" textAnchor="middle">
                      <text x="50" y="270">Start</text>
                      <text x="182.5" y="270">25%</text>
                      <text x="315" y="270">50%</text>
                      <text x="447.5" y="270">75%</text>
                      <text x="580" y="270">End</text>
                    </g>

                    {/* Release curve */}
                    <path
                      d={curveData.map((point, i) => {
                        const x = 50 + (i / (curveData.length - 1)) * 530;
                        const y = 250 - (point.percentage * 2);
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Fill area under curve */}
                    <path
                      d={
                        curveData.map((point, i) => {
                          const x = 50 + (i / (curveData.length - 1)) * 530;
                          const y = 250 - (point.percentage * 2);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ') + ' L 580 250 L 50 250 Z'
                      }
                      fill="#22c55e"
                      opacity="0.1"
                    />

                    {/* Axis labels */}
                    <text x="315" y="290" fill="#64748b" fontSize="14" fontWeight="bold" textAnchor="middle">
                      Time Progress
                    </text>
                    <text
                      x="20"
                      y="150"
                      fill="#64748b"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      transform="rotate(-90 20 150)"
                    >
                      Rewards Released
                    </text>
                  </svg>
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>Quadratic Release:</strong> Early stakers receive proportionally more rewards.
                    This curve ensures 50% of rewards are distributed in the first 25% of time,
                    encouraging early participation and sustained engagement.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {needsApproval ? (
            <Button
              onClick={handleApprove}
              disabled={isPending || isConfirming || !address}
              className="flex-1"
            >
              {isPending || isConfirming ? 'Approving...' : `Approve ${tokenSymbol}`}
            </Button>
          ) : (
            <Button
              onClick={handleCreateBribe}
              disabled={isPending || isConfirming || !address || !endDate || (startOption === 'custom' && !customStartDate)}
              className="flex-1"
            >
              {isPending || isConfirming ? 'Creating...' : 'Create Bribe Pool'}
            </Button>
          )}
        </div>

        {createSuccess && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <AlertDescription>
              ✅ Bribe pool created successfully! Redirecting back to market...
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
