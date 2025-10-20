import { motion } from 'framer-motion'
import { mockUsageRecords } from '@/mock/data'
import { ArrowUpRight } from 'lucide-react'

const UsageRecordsTable = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      className="glass-card"
    >
      <h2 className="text-2xl font-bold text-white mb-6">使用与收益记录</h2>

      <div className="overflow-x-auto scrollbar-custom">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                时间
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                应用
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                调取内容
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                使用方/范围
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                费用/奖励
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border/50">
            {mockUsageRecords.map((record, index) => (
              <motion.tr
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.05 }}
                className="hover:bg-dark-hover/50 transition-colors duration-200 cursor-pointer"
              >
                <td className="px-4 py-4 text-sm text-gray-400 whitespace-nowrap">
                  {record.timestamp}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-white">
                    {record.appName}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-300">
                  {record.queryContent}
                </td>
                <td className="px-4 py-4 text-sm text-gray-400">
                  {record.scope}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-sm font-semibold text-emerald-400">
                      + {record.reward.toFixed(1)} CRN
                    </span>
                    <ArrowUpRight size={14} className="text-emerald-400" />
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <span>显示 1-5 条，共 {mockUsageRecords.length} 条记录</span>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-dark-card hover:bg-dark-hover transition-colors">
            上一页
          </button>
          <button className="px-3 py-1 rounded bg-dark-card hover:bg-dark-hover transition-colors">
            下一页
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default UsageRecordsTable

