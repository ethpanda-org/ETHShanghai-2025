import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading = false,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          )}

          {trend && !loading && (
            <p
              className={clsx(
                'mt-2 text-sm font-medium',
                trend.isPositive ? 'text-success' : 'text-error'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className="ml-4">
          <div className="rounded-full bg-primary-50 p-3">
            <Icon className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
