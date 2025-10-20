import { motion } from 'framer-motion'
import { mockUser, mockCreditScore, mockSBTBadges, mockCRNBalance, getFormattedCRNBalance } from '@/mock/data'
import { StarBorder } from '@/components/StarBorder'
import { Shield, Award, TrendingUp } from 'lucide-react'

const Profile = () => {
  return (
    <div className="space-y-6">
      {/* 用户信息卡片 */}
      <StarBorder starCount={10} speed={0.6} starColor="#60a5fa" glowColor="#3b82f6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="gradient-border-card"
        >
          <div className="flex items-start gap-6">
            {/* 头像 */}
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-4xl font-bold text-white">
              C
            </div>

            {/* 用户信息 */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{mockUser.did}</h1>
              <div className="space-y-1 text-sm text-gray-400">
                <div>Address: {mockUser.address}</div>
                <div>Joined: {mockUser.joinedDate}</div>
                <div>Last sync: {mockUser.lastSync}</div>
              </div>
            </div>

            {/* C-Score */}
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">C-Score</div>
              <div className="text-5xl font-bold text-gradient">{mockCreditScore.total}</div>
              <div className="text-sm text-emerald-400 mt-1">▲ {mockCreditScore.change}</div>
            </div>
          </div>
        </motion.div>
      </StarBorder>

      {/* 我的SBT勋章和积分与成就 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 我的SBT勋章 */}
        <StarBorder starCount={8} speed={0.5} starColor="#a78bfa" glowColor="#8b5cf6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-card"
          >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award size={24} className="text-purple-400" />
            我的 SBT 勋章
          </h2>

          <div className="space-y-4">
            {mockSBTBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-dark-card/50 border border-dark-border hover:border-primary-500/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-2xl">
                  🏆
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white mb-1">{badge.name}</div>
                  <div className="text-xs text-gray-400">{badge.description}</div>
                </div>
                <div className="text-xs text-gray-500">{badge.earnedDate}</div>
              </div>
            ))}
          </div>
          </motion.div>
        </StarBorder>

        {/* 积分与成就 */}
        <StarBorder starCount={8} speed={0.5} starColor="#fbbf24" glowColor="#f59e0b">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card"
          >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-emerald-400" />
            积分与成就
          </h2>

          {/* CRN积分 */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-card">
            <div className="text-sm text-gray-400 mb-2">CRN 积分</div>
            <div className="text-4xl font-bold text-gradient mb-2">
              {getFormattedCRNBalance(2)}
            </div>
            <div className="text-sm text-emerald-400">
              近 30 天变化：+{mockCRNBalance.change30d}
            </div>
          </div>

          {/* 成就列表 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-card/30">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                ✓
              </div>
              <div className="text-sm text-gray-300">完成 3 个应用授权</div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-card/30">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                ✓
              </div>
              <div className="text-sm text-gray-300">提交 2 个 Off-chain VC</div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-card/30">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                ✓
              </div>
              <div className="text-sm text-gray-300">产生 5 笔收益记录</div>
            </div>
          </div>

          <button className="btn-primary w-full mt-6">导出凭证</button>
          </motion.div>
        </StarBorder>
      </div>

      {/* 安全与隐私 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Shield size={24} className="text-blue-400" />
          安全与隐私
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-dark-card/30">
            <div className="text-sm text-gray-400 mb-2">• 本地加密密钥存储</div>
            <div className="text-xs text-emerald-400">✓ 已启用</div>
          </div>
          
          <div className="p-4 rounded-xl bg-dark-card/30">
            <div className="text-sm text-gray-400 mb-2">• 授权应用与撤销一览</div>
            <div className="text-xs text-cyan-400">3 个应用已授权</div>
          </div>
          
          <div className="p-4 rounded-xl bg-dark-card/30">
            <div className="text-sm text-gray-400 mb-2">• 数据可导出/可迁移</div>
            <div className="text-xs text-gray-500">随时导出</div>
          </div>
        </div>

        <button className="btn-secondary mt-6">管理授权</button>
      </motion.div>
    </div>
  )
}

export default Profile

