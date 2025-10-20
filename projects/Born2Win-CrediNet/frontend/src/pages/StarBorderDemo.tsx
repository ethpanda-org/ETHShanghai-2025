/**
 * 星星边框效果演示页面
 * 展示各种应用场景
 */

import {
  EnhancedCreditRadarChart,
  CreditScoreCard,
  SBTBadgeCard,
  NotificationCard,
  StatCard
} from '../components/EnhancedCreditComponents';
import { TrendingUp, Users, Award, Activity } from 'lucide-react';

export default function StarBorderDemo() {
  // 示例数据
  const mockDimensions = {
    keystone: 85,
    ability: 78,
    finance: 92,
    health: 88,
    behavior: 90
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            ✨ 星星边框特效演示
          </h1>
          <p className="text-xl text-gray-300">
            将动态边框效果应用到 CrediNet 项目中
          </p>
        </div>

        {/* 信用分数卡片 */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">1. 信用分数展示</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CreditScoreCard score={850} change={25} level="优秀" />
            <CreditScoreCard score={720} change={12} level="良好" />
            <CreditScoreCard score={650} change={-5} level="中等" />
            <CreditScoreCard score={580} change={8} level="待提升" />
          </div>
        </section>

        {/* 雷达图 */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">2. 增强版信用雷达图</h2>
          <EnhancedCreditRadarChart data={mockDimensions} />
        </section>

        {/* 统计卡片 */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">3. 数据统计卡片</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="总交易量"
              value="1,234"
              subtitle="+12% 本月"
              icon={<TrendingUp />}
            />
            <StatCard
              label="活跃用户"
              value="856"
              subtitle="+8% 本周"
              icon={<Users />}
            />
            <StatCard
              label="获得奖励"
              value="42"
              subtitle="累计奖励"
              icon={<Award />}
            />
            <StatCard
              label="信用评分"
              value="850"
              subtitle="历史最高"
              icon={<Activity />}
            />
          </div>
        </section>

        {/* SBT 徽章 */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">4. SBT 徽章展示</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SBTBadgeCard
              title="创世徽章"
              description="早期用户专属徽章"
              tokenId="0x1234...5678"
              rarity="legendary"
            />
            <SBTBadgeCard
              title="信用大使"
              description="信用分数达到800分"
              tokenId="0x2345...6789"
              rarity="epic"
            />
            <SBTBadgeCard
              title="活跃贡献者"
              description="完成100次交易"
              tokenId="0x3456...7890"
              rarity="rare"
            />
            <SBTBadgeCard
              title="新手探索者"
              description="完成身份验证"
              tokenId="0x4567...8901"
              rarity="common"
            />
          </div>
        </section>

        {/* 通知卡片 */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">5. 通知/警报卡片</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NotificationCard
              type="success"
              title="信用分数已更新"
              message="您的信用分数提升了 25 分，达到 850 分！继续保持良好记录。"
            />
            <NotificationCard
              type="info"
              title="新功能上线"
              message="现在可以使用 AI 代理自动管理您的 SBT 了，快去体验吧！"
            />
            <NotificationCard
              type="warning"
              title="需要完善资料"
              message="您的身份信息还未完善，建议尽快完成以获得更准确的信用评分。"
            />
            <NotificationCard
              type="error"
              title="授权即将过期"
              message="您授予 DApp A 的数据访问权限将在 3 天后过期，请及时续期。"
            />
          </div>
        </section>

        {/* 集成说明 */}
        <section className="mt-16 p-8 bg-gray-800/50 rounded-2xl border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">📝 如何在项目中使用</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">1. 直接包裹现有组件</h3>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>{`import { StarBorder } from '@/components/StarBorder';

<StarBorder>
  <YourExistingComponent />
</StarBorder>`}</code>
              </pre>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">2. 使用预制的增强组件</h3>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>{`import { EnhancedCreditRadarChart } from '@/components/EnhancedCreditComponents';

<EnhancedCreditRadarChart data={dimensions} />`}</code>
              </pre>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">3. 自定义样式</h3>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>{`<StarBorder
  starCount={10}
  speed={0.6}
  starColor="#fbbf24"
  glowColor="#f59e0b"
>
  <YourComponent />
</StarBorder>`}</code>
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

