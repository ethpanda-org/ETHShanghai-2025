import { motion } from 'framer-motion'
import { useState } from 'react'
import ToggleSwitch from '@/components/ui/ToggleSwitch'

const Settings = () => {
  const [settings, setSettings] = useState({
    displayName: 'CrediNet User',
    language: '简体中文',
    timezone: 'UTC +08:00',
    systemNotifications: true,
    rewardNotifications: true,
    authChanges: false,
    theme: 'galaxy',
    contrastEnhanced: false
  })

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold text-gradient mb-3">设置</h1>
        <p className="text-gray-400 text-lg">管理您的偏好设置和账户配置</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 侧边栏菜单 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card h-fit"
        >
          <h2 className="text-lg font-bold text-white mb-4">设置</h2>
          <div className="space-y-2">
            {['通用', '通知', '外观', '隐私与数据', '关于'].map((item) => (
              <button
                key={item}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-dark-hover hover:text-cyan-400 transition-all"
              >
                • {item}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 设置内容区 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 通用设置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card"
          >
            <h2 className="text-2xl font-bold text-white mb-6">通用</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">显示名称</label>
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">语言</label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="input-field"
                  >
                    <option>简体中文</option>
                    <option>English</option>
                    <option>日本語</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">时区</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="input-field"
                  >
                    <option>UTC +08:00</option>
                    <option>UTC +00:00</option>
                    <option>UTC -05:00</option>
                  </select>
                </div>
              </div>

              <button className="btn-primary">保存</button>
            </div>
          </motion.div>

          {/* 通知设置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="glass-card"
          >
            <h2 className="text-2xl font-bold text-white mb-6">通知</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-dark-card/30">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">系统通知</div>
                  <div className="text-xs text-gray-400">接收系统更新和重要消息</div>
                </div>
                <ToggleSwitch
                  checked={settings.systemNotifications}
                  onChange={(checked) => setSettings({ ...settings, systemNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-dark-card/30">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">收益提醒</div>
                  <div className="text-xs text-gray-400">新的CRN收益到账时通知</div>
                </div>
                <ToggleSwitch
                  checked={settings.rewardNotifications}
                  onChange={(checked) => setSettings({ ...settings, rewardNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-dark-card/30">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">授权变化</div>
                  <div className="text-xs text-gray-400">数据授权状态变更时通知</div>
                </div>
                <ToggleSwitch
                  checked={settings.authChanges}
                  onChange={(checked) => setSettings({ ...settings, authChanges: checked })}
                />
              </div>
            </div>
          </motion.div>

          {/* 外观设置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="glass-card"
          >
            <h2 className="text-2xl font-bold text-white mb-6">外观</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">主题</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="input-field"
                >
                  <option value="galaxy">银河 · 玻璃</option>
                  <option value="dark">深邃 · 黑暗</option>
                  <option value="light">明亮 · 浅色</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-dark-card/30">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">对比度增强</div>
                  <div className="text-xs text-gray-400">提高文字和界面的对比度</div>
                </div>
                <ToggleSwitch
                  checked={settings.contrastEnhanced}
                  onChange={(checked) => setSettings({ ...settings, contrastEnhanced: checked })}
                />
              </div>
            </div>
          </motion.div>

          {/* 隐私与数据 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="glass-card"
          >
            <h2 className="text-2xl font-bold text-white mb-6">隐私与数据</h2>
            
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>数据本地加密存储</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>可导出 VC / 撤销授权</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>支持多设备同步（实验性）</span>
              </div>
            </div>

            <button className="btn-secondary mt-6">导出数据</button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Settings

