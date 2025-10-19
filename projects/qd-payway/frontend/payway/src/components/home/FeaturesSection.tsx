import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Zap, Bot } from 'lucide-react'

const features = [
  {
    icon: Lock,
    title: '🔒 安全托管',
    description: '基于智能合约的去中心化托管',
    details: '资金由智能合约托管，平台无法触碰您的资产。代码公开透明，经过安全审计，确保每一笔交易的安全性。',
  },
  {
    icon: Zap,
    title: '⚡ 简单易用',
    description: '一键连接钱包，无需懂区块链',
    details: '无需学习复杂的区块链知识，连接钱包即可使用。界面简洁友好，就像使用传统支付工具一样简单。',
  },
  {
    icon: Bot,
    title: '🤖 自动结算',
    description: '条件满足后自动释放资金',
    details: '设定好放款条件后，智能合约会自动验证并执行。无需人工确认，效率提升10倍，彻底消除信任成本。',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 sm:py-32 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            为什么选择 PayWay?
          </h2>
          <p className="text-lg text-gray-600">
            我们致力于让区块链支付变得简单、安全、高效
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="transition-all duration-200 hover:border-teal-300 hover:bg-teal-50/30"
            >
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{feature.details}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h3 className="mb-12 text-center text-2xl font-bold text-gray-900">
            工作流程
          </h3>
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-lg font-bold text-teal-600">
                  1
                </div>
                <h4 className="mb-2 font-semibold text-gray-900">创建订单</h4>
                <p className="text-sm text-gray-600">
                  填写收款信息和放款条件，资金锁定在智能合约中
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-lg font-bold text-cyan-600">
                  2
                </div>
                <h4 className="mb-2 font-semibold text-gray-900">等待履约</h4>
                <p className="text-sm text-gray-600">
                  收款方完成服务或交付产品
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-lg font-bold text-emerald-600">
                  3
                </div>
                <h4 className="mb-2 font-semibold text-gray-900">自动放款</h4>
                <p className="text-sm text-gray-600">
                  确认履约后，智能合约自动释放资金
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

