import { Web3Login } from "@/components/auth/web3-login"

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - Inspiration Wall */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-primary to-accent p-12">
        <div className="max-w-md space-y-6 text-white">
          <h1 className="text-4xl font-bold">欢迎来到炒词</h1>
          <p className="text-lg opacity-90">连接你的Web3钱包，开启AI创作之旅</p>
          <div className="space-y-4 pt-6">
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm">
              <h3 className="font-semibold mb-2">🔐 安全可靠</h3>
              <p className="text-sm opacity-80">使用去中心化钱包，保护你的数字资产</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm">
              <h3 className="font-semibold mb-2">⚡ 快速便捷</h3>
              <p className="text-sm opacity-80">一键连接，即刻开始创作和交易</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm">
              <h3 className="font-semibold mb-2">🌐 多链支持</h3>
              <p className="text-sm opacity-80">支持以太坊、Polygon、BSC等主流EVM链</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Web3 Login */}
      <div className="flex items-center justify-center p-8 bg-background">
        <Web3Login />
      </div>
    </div>
  )
}
