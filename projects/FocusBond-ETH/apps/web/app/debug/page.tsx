"use client"

import { WalletDebug } from '../../components/WalletDebug'

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🔧 钱包连接调试</h1>
        <WalletDebug />
        
        <div className="mt-8 p-4 bg-gray-800 rounded-lg text-white">
          <h3 className="text-lg font-bold mb-4">📋 使用说明</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>点击"连接钱包"按钮</li>
            <li>在MetaMask中选择"导入账户"</li>
            <li>粘贴私钥: <code className="bg-gray-700 px-2 py-1 rounded">0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</code></li>
            <li>确保网络设置为"Anvil Local" (Chain ID: 31337)</li>
            <li>查看余额是否正确显示</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
