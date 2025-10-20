import { motion } from 'framer-motion'
import { mockUser, mockCreditScore } from '@/mock/data'
import CreditRadarChart from '@/components/charts/CreditRadarChart'
import SBTBadgePreview from '@/components/dashboard/SBTBadgePreview'
import DataSourcesPanel from '@/components/dashboard/DataSourcesPanel'
import CRNBalanceCard from '@/components/dashboard/CRNBalanceCard'
import EcoAppsGrid from '@/components/dashboard/EcoAppsGrid'
import UsageRecordsTable from '@/components/dashboard/UsageRecordsTable'
import CreditScoreDisplay from '@/components/web3/CreditScoreDisplay'
import SBTDynamicDisplay from '@/components/sbt/SBTDynamicDisplay'
import { StarBorder } from '@/components/StarBorder'
import { useAccount } from 'wagmi'
import { Copy } from 'lucide-react'

const Dashboard = () => {
  const { isConnected, address } = useAccount()
  
  const handleCopyDID = () => {
    const did = isConnected ? `did:credinet:${address}` : mockUser.did
    navigator.clipboard.writeText(did)
    // TODO: 添加Toast提示
    alert('DID已复制到剪贴板')
  }

  return (
    <div className="space-y-6">
      {/* 用户DID卡片 */}
      <StarBorder starCount={8} speed={0.5} starColor="#60a5fa" glowColor="#3b82f6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="gradient-border-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-blue-400">🔷</span>
                  DID: {isConnected ? `did:credinet:${address}` : mockUser.did}
                </h1>
                <button
                  onClick={handleCopyDID}
                  className="p-2 rounded-lg bg-dark-card hover:bg-dark-hover transition-colors"
                  title="复制DID"
                >
                  <Copy size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="text-sm text-gray-400">
                <span>Address: {isConnected ? address : mockUser.address}</span>
                <span className="mx-2">•</span>
                <span>Last update: {mockUser.lastSync}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">C-Score</div>
              <div className="text-5xl font-bold text-gradient">
                {mockCreditScore.total}
              </div>
              <div className="text-sm text-emerald-400 mt-1">
                ▲ {mockCreditScore.change}
              </div>
            </div>
          </div>
        </motion.div>
      </StarBorder>

      {/* 合约数据展示 */}
      {isConnected ? (
        <div className="space-y-6">
          {/* 动态SBT展示 */}
          <SBTDynamicDisplay />
          
          {/* 信用评分展示 */}
          <CreditScoreDisplay />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StarBorder starCount={10} speed={0.6} starColor="#60a5fa" glowColor="#3b82f6">
            <CreditRadarChart />
          </StarBorder>
          <StarBorder starCount={8} speed={0.5} starColor="#a78bfa" glowColor="#8b5cf6">
            <SBTBadgePreview />
          </StarBorder>
        </div>
      )}

      {/* CRN余额 */}
      <StarBorder starCount={6} speed={0.4} starColor="#34d399" glowColor="#10b981">
        <CRNBalanceCard />
      </StarBorder>

      {/* 数据接入状态 */}
      <DataSourcesPanel />

      {/* 生态应用入口 */}
      <EcoAppsGrid />

      {/* 使用与收益记录 */}
      <UsageRecordsTable />
    </div>
  )
}

export default Dashboard

