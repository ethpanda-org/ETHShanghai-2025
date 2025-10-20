import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChainRankCardProps {
  agent: string;
  score: number;
  totalTransactions: number;
  successRate: number;
  trend: 'up' | 'down' | 'stable';
}

export function ChainRankCard({
  agent,
  score,
  totalTransactions,
  successRate,
  trend,
}: ChainRankCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-gray-500';

  const scoreColor =
    score >= 90
      ? 'text-green-600'
      : score >= 70
      ? 'text-blue-600'
      : score >= 50
      ? 'text-yellow-600'
      : 'text-red-600';

  const progressColor =
    score >= 90
      ? 'bg-green-600'
      : score >= 70
      ? 'bg-blue-600'
      : score >= 50
      ? 'bg-yellow-600'
      : 'bg-red-600';

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">ChainRank Score</h3>
        <TrendIcon className={`h-6 w-6 ${trendColor}`} />
      </div>

      <div className="mb-6 text-center">
        <div className={`text-6xl font-bold ${scoreColor}`}>{score}</div>
        <div className="mt-1 text-sm text-gray-500">/ 100</div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Agent:</span>
          <span className="font-mono text-gray-900">
            {agent.slice(0, 6)}...{agent.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Transactions:</span>
          <span className="font-semibold text-gray-900">{totalTransactions}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Success Rate:</span>
          <span className="font-semibold text-gray-900">{successRate}%</span>
        </div>
      </div>

      <div className="mt-6">
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
