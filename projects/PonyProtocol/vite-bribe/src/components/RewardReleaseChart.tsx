import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BribePool {
  totalAmount: bigint;
  startTime: bigint;
  endTime: bigint;
  tokenDecimals: number;
}

interface RewardReleaseChartProps {
  // 只传入REWARD代币的池子
  rewardPools: BribePool[];
  tokenSymbol: string;
  marketEndTime: bigint; // Market的结束时间，用作X轴终点
}

export function RewardReleaseChart({ rewardPools, tokenSymbol, marketEndTime }: RewardReleaseChartProps) {
  // 计算累计释放曲线数据
  const chartData = useMemo(() => {
    if (rewardPools.length === 0) return null;

    // X轴起点固定为"现在"（今天），终点为market的结束时间
    const now = Math.floor(Date.now() / 1000);
    const chartStart = now;
    const chartEnd = Number(marketEndTime);

    const totalDuration = chartEnd - chartStart;
    if (totalDuration <= 0) return null;

    // 计算总奖励量
    let totalRewards = 0;
    rewardPools.forEach(pool => {
      totalRewards += parseFloat(pool.totalAmount.toString()) / Math.pow(10, pool.tokenDecimals);
    });

    // 生成时间点数据 - 计算每个间隔的释放速率
    const points = [];
    const numPoints = 50;
    const intervalDuration = totalDuration / numPoints; // 每个间隔的秒数

    for (let i = 0; i <= numPoints; i++) {
      const timestamp = chartStart + (totalDuration * i / numPoints);
      const nextTimestamp = timestamp + intervalDuration;

      let cumulativeAtStart = 0;
      let cumulativeAtEnd = 0;

      // 对每个池子，计算这个时间间隔内释放了多少
      rewardPools.forEach(pool => {
        const poolStart = Number(pool.startTime);
        const poolEnd = Number(pool.endTime);
        const poolDuration = poolEnd - poolStart;
        const poolAmount = parseFloat(pool.totalAmount.toString()) / Math.pow(10, pool.tokenDecimals);

        // 计算间隔开始时的累计释放量
        if (timestamp < poolStart) {
          // 还没开始
        } else if (timestamp >= poolEnd) {
          cumulativeAtStart += poolAmount;
        } else {
          const progress = (timestamp - poolStart) / poolDuration;
          cumulativeAtStart += poolAmount * Math.sqrt(progress);
        }

        // 计算间隔结束时的累计释放量
        if (nextTimestamp < poolStart) {
          // 还没开始
        } else if (nextTimestamp >= poolEnd) {
          cumulativeAtEnd += poolAmount;
        } else {
          const progress = (nextTimestamp - poolStart) / poolDuration;
          cumulativeAtEnd += poolAmount * Math.sqrt(progress);
        }
      });

      // 这个间隔内释放的增量
      const intervalRelease = cumulativeAtEnd - cumulativeAtStart;
      // 转换为每天的释放速率
      const releasePerDay = intervalRelease / (intervalDuration / 86400);

      points.push({
        timestamp,
        date: new Date(timestamp * 1000),
        releaseRate: releasePerDay, // 每天释放的数量
        intervalRelease, // 这个间隔内释放的总量
        progressPercent: (i / numPoints) * 100,
      });
    }

    // 找到最大释放速率，用于Y轴缩放
    const maxReleaseRate = Math.max(...points.map(p => p.releaseRate));

    return {
      points,
      chartStart,
      chartEnd,
      totalRewards,
      totalDuration,
      maxReleaseRate,
    };
  }, [rewardPools, marketEndTime]);

  if (!chartData || rewardPools.length === 0) {
    return null;
  }

  const { points, chartStart, chartEnd, totalRewards, maxReleaseRate } = chartData;

  // 找到关键时间点的数据（50%用于显示在stats中）
  const at50 = points[Math.floor(points.length * 0.50)];

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Total {tokenSymbol} Release Curve</CardTitle>
        <CardDescription>
          Cumulative rewards released across all {rewardPools.length} {tokenSymbol} pool{rewardPools.length > 1 ? 's' : ''} over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Key Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Total Pools</div>
              <div className="text-lg font-bold">{rewardPools.length}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Total {tokenSymbol}</div>
              <div className="text-lg font-bold">{totalRewards.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Time Range</div>
              <div className="text-sm font-bold">
                Now → {new Date(chartEnd * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Peak Rate/Day</div>
              <div className="text-lg font-bold text-green-600">{maxReleaseRate.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Max daily release</div>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full" style={{ height: '300px' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              <g stroke="#e5e7eb" strokeWidth="1" opacity="0.3">
                {[0, 25, 50, 75, 100].map((y) => (
                  <line
                    key={`h-${y}`}
                    x1="60"
                    y1={250 - (y * 2)}
                    x2="780"
                    y2={250 - (y * 2)}
                    strokeDasharray="4 4"
                  />
                ))}
                {[0, 25, 50, 75, 100].map((x) => (
                  <line
                    key={`v-${x}`}
                    x1={60 + (x * 7.2)}
                    y1="50"
                    x2={60 + (x * 7.2)}
                    y2="250"
                    strokeDasharray="4 4"
                  />
                ))}
              </g>

              {/* Axes */}
              <line x1="60" y1="250" x2="780" y2="250" stroke="#64748b" strokeWidth="2" />
              <line x1="60" y1="50" x2="60" y2="250" stroke="#64748b" strokeWidth="2" />

              {/* Y-axis labels (release rate per day) */}
              <g fill="#64748b" fontSize="12" textAnchor="end">
                <text x="55" y="254">0</text>
                <text x="55" y="204">{(maxReleaseRate * 0.25).toFixed(0)}</text>
                <text x="55" y="154">{(maxReleaseRate * 0.5).toFixed(0)}</text>
                <text x="55" y="104">{(maxReleaseRate * 0.75).toFixed(0)}</text>
                <text x="55" y="54">{maxReleaseRate.toFixed(0)}</text>
              </g>

              {/* X-axis labels (time progress) */}
              <g fill="#64748b" fontSize="11" textAnchor="middle">
                <text x="60" y="268">Now</text>
                <text x="60" y="282" fontSize="9">
                  {new Date(chartStart * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
                <text x="240" y="268">25%</text>
                <text x="420" y="268">50%</text>
                <text x="600" y="268">75%</text>
                <text x="780" y="268">Market End</text>
                <text x="780" y="282" fontSize="9">
                  {new Date(chartEnd * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              </g>

              {/* Release rate curve - shows daily release amount */}
              <path
                d={points.map((point, i) => {
                  const x = 60 + (i / (points.length - 1)) * 720;
                  const y = 250 - (point.releaseRate / maxReleaseRate) * 200;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Fill area under curve */}
              <path
                d={
                  points.map((point, i) => {
                    const x = 60 + (i / (points.length - 1)) * 720;
                    const y = 250 - (point.releaseRate / maxReleaseRate) * 200;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ') + ' L 780 250 L 60 250 Z'
                }
                fill="#3b82f6"
                opacity="0.15"
              />

              {/* Marker at 50% time point */}
              <circle
                cx={60 + 720 * 0.5}
                cy={250 - (at50.releaseRate / maxReleaseRate) * 200}
                r="5"
                fill="#22c55e"
                stroke="#fff"
                strokeWidth="2"
              />


              {/* Axis labels */}
              <text x="420" y="295" fill="#64748b" fontSize="13" fontWeight="bold" textAnchor="middle">
                Time Progress
              </text>
              <text
                x="25"
                y="150"
                fill="#64748b"
                fontSize="13"
                fontWeight="bold"
                textAnchor="middle"
                transform="rotate(-90 25 150)"
              >
                Release Rate ({tokenSymbol.replace(' (YES)', '').replace(' (NO)', '')} /day)
              </text>
            </svg>
          </div>

          {/* Explanation */}
          <Alert>
            <AlertDescription className="text-xs">
              <strong>📈 How to read this chart:</strong> This shows the daily release rate of all {tokenSymbol} bribe pools combined.
              The Y-axis represents how many tokens are released per day at each point in time.
              Due to the quadratic release mechanism, the release rate is highest at the beginning and gradually decreases over time.
              The green dot marks the release rate at the 50% time point ({at50.releaseRate.toFixed(2)} {tokenSymbol.replace(' (YES)', '').replace(' (NO)', '')}/day).
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
