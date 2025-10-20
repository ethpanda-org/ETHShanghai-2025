/**
 * 带星星边框效果的增强版信用组件
 * 展示如何将 StarBorder 应用到实际项目中
 */

import { StarBorder } from './StarBorder';
import CreditRadarChart from './charts/CreditRadarChart';
import { motion } from 'framer-motion';

// ==================== 1. 带星星边框的信用雷达图 ====================
interface EnhancedCreditRadarChartProps {
  data?: {
    keystone: number;
    ability: number;
    finance: number;
    health: number;
    behavior: number;
  };
}

export const EnhancedCreditRadarChart: React.FC<EnhancedCreditRadarChartProps> = ({ data }) => {
  return (
    <StarBorder
      starCount={8}
      speed={0.5}
      starColor="#60a5fa"
      glowColor="#3b82f6"
      borderRadius="1.5rem"
    >
      <CreditRadarChart data={data} />
    </StarBorder>
  );
};

// ==================== 2. 信用分数展示卡片 ====================
interface CreditScoreCardProps {
  score: number;
  change: number;
  level: string;
}

export const CreditScoreCard: React.FC<CreditScoreCardProps> = ({
  score,
  change,
  level
}) => {
  // 根据分数选择不同的颜色主题
  const getTheme = (score: number) => {
    if (score >= 800) return { starColor: '#34d399', glowColor: '#10b981', gradient: 'from-emerald-400 to-green-500' };
    if (score >= 700) return { starColor: '#60a5fa', glowColor: '#3b82f6', gradient: 'from-blue-400 to-cyan-500' };
    if (score >= 600) return { starColor: '#fbbf24', glowColor: '#f59e0b', gradient: 'from-yellow-400 to-orange-500' };
    return { starColor: '#ef4444', glowColor: '#dc2626', gradient: 'from-red-400 to-rose-500' };
  };

  const theme = getTheme(score);

  return (
    <StarBorder
      starCount={10}
      speed={0.6}
      starColor={theme.starColor}
      glowColor={theme.glowColor}
    >
      <motion.div
        className="p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-4">
          <div className={`text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient}`}>
            {score}
          </div>
        </div>
        <div className="mb-2">
          <span className="text-2xl font-semibold text-white">{level}</span>
        </div>
        <div className="text-lg">
          <span className={change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}
          </span>
          <span className="text-gray-400 ml-2">较上月</span>
        </div>
      </motion.div>
    </StarBorder>
  );
};

// ==================== 3. SBT 徽章卡片 ====================
interface SBTBadgeCardProps {
  title: string;
  description: string;
  tokenId?: string;
  imageUrl?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export const SBTBadgeCard: React.FC<SBTBadgeCardProps> = ({
  title,
  description,
  tokenId,
  imageUrl,
  rarity = 'common'
}) => {
  // 根据稀有度选择主题
  const rarityTheme = {
    common: { starColor: '#94a3b8', glowColor: '#64748b', starCount: 3, speed: 0.4 },
    rare: { starColor: '#60a5fa', glowColor: '#3b82f6', starCount: 5, speed: 0.5 },
    epic: { starColor: '#a78bfa', glowColor: '#8b5cf6', starCount: 8, speed: 0.6 },
    legendary: { starColor: '#fbbf24', glowColor: '#f59e0b', starCount: 12, speed: 0.7 }
  };

  const theme = rarityTheme[rarity];

  return (
    <StarBorder
      starCount={theme.starCount}
      speed={theme.speed}
      starColor={theme.starColor}
      glowColor={theme.glowColor}
      borderRadius="1rem"
    >
      <motion.div
        className="p-6"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${theme.glowColor} 0%, ${theme.starColor} 100%)`
            }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full rounded-xl object-cover" />
            ) : (
              '🎖️'
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400 mb-2">{description}</p>
            {tokenId && (
              <div className="text-xs text-gray-500">
                Token ID: {tokenId}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </StarBorder>
  );
};

// ==================== 4. 通知/警报卡片 ====================
interface NotificationCardProps {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  title,
  message,
  type = 'info'
}) => {
  const typeTheme = {
    info: { starColor: '#60a5fa', glowColor: '#3b82f6', icon: 'ℹ️', bg: 'bg-blue-500/10' },
    success: { starColor: '#34d399', glowColor: '#10b981', icon: '✓', bg: 'bg-green-500/10' },
    warning: { starColor: '#fbbf24', glowColor: '#f59e0b', icon: '⚠️', bg: 'bg-yellow-500/10' },
    error: { starColor: '#ef4444', glowColor: '#dc2626', icon: '✕', bg: 'bg-red-500/10' }
  };

  const theme = typeTheme[type];

  return (
    <StarBorder
      starCount={6}
      speed={0.7}
      starColor={theme.starColor}
      glowColor={theme.glowColor}
    >
      <div className={`p-6 ${theme.bg}`}>
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
            style={{
              backgroundColor: theme.glowColor + '40',
              color: theme.starColor
            }}
          >
            {theme.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-300">{message}</p>
          </div>
        </div>
      </div>
    </StarBorder>
  );
};

// ==================== 5. 数据统计卡片 ====================
interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon
}) => {
  return (
    <StarBorder
      starCount={4}
      speed={0.4}
      starColor="#60a5fa"
      glowColor="#3b82f6"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400 font-medium">{label}</span>
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              {icon}
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        {subtitle && (
          <div className="text-sm text-gray-400">{subtitle}</div>
        )}
      </div>
    </StarBorder>
  );
};

