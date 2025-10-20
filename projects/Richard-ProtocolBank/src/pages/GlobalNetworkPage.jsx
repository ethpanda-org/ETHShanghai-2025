import { Card, CardContent } from '@/components/ui/card.jsx'
import { Globe, Activity, Zap, Shield, TrendingUp, CheckCircle } from 'lucide-react'

export default function GlobalNetworkPage() {
  const networkNodes = [
    { region: 'North America', nodes: 12, status: 'operational', uptime: 99.98, tps: 2847 },
    { region: 'Europe', nodes: 18, status: 'operational', uptime: 99.95, tps: 3256 },
    { region: 'Asia Pacific', nodes: 15, status: 'operational', uptime: 99.97, tps: 4123 },
    { region: 'Latin America', nodes: 8, status: 'operational', uptime: 99.92, tps: 1567 },
    { region: 'Middle East', nodes: 6, status: 'operational', uptime: 99.94, tps: 892 }
  ]

  const supportedCurrencies = [
    { code: 'USD', name: 'US Dollar', network: 'Fedwire/CHIPS', countries: 'United States', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', network: 'TARGET2', countries: 'European Union', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', network: 'CHAPS', countries: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CNY', name: 'Chinese Yuan', network: 'CIPS', countries: 'China', flag: '🇨🇳' },
    { code: 'JPY', name: 'Japanese Yen', network: 'BOJ-NET', countries: 'Japan', flag: '🇯🇵' },
    { code: 'CHF', name: 'Swiss Franc', network: 'SIC', countries: 'Switzerland', flag: '🇨🇭' }
  ]

  const partners = [
    { name: 'Solana Foundation', type: 'Blockchain Partner', since: '2023' },
    { name: 'Circle (USDC)', type: 'Stablecoin Provider', since: '2023' },
    { name: 'Chainlink', type: 'Oracle Network', since: '2024' },
    { name: 'Fireblocks', type: 'Custody Solution', since: '2023' }
  ]

  const compliance = [
    { standard: 'ISO 20022', description: 'Financial messaging standard', status: 'Certified' },
    { standard: 'PCI DSS Level 1', description: 'Payment card industry security', status: 'Certified' },
    { standard: 'SOC 2 Type II', description: 'Security & availability controls', status: 'Certified' },
    { standard: 'GDPR', description: 'Data protection regulation', status: 'Compliant' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-normal text-gray-900 mb-2">Global Network</h2>
        <p className="text-sm text-gray-500">Real-time monitoring of our worldwide payment infrastructure</p>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <div className="text-sm text-gray-500">Total Nodes</div>
            </div>
            <div className="text-2xl font-light text-gray-900">59</div>
            <div className="text-xs text-green-600 mt-1">Across 5 regions</div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <div className="text-sm text-gray-500">Network Uptime</div>
            </div>
            <div className="text-2xl font-light text-gray-900">99.96%</div>
            <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-4 w-4 text-gray-500" />
              <div className="text-sm text-gray-500">Transactions/sec</div>
            </div>
            <div className="text-2xl font-light text-gray-900">12,685</div>
            <div className="text-xs text-green-600 mt-1">↑ 24% vs last week</div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <div className="text-sm text-gray-500">Avg. Latency</div>
            </div>
            <div className="text-2xl font-light text-gray-900">180ms</div>
            <div className="text-xs text-gray-500 mt-1">Global average</div>
          </CardContent>
        </Card>
      </div>

      {/* Network Map Placeholder */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-medium text-gray-900">Global Node Distribution</h3>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-12 text-center">
            <Globe className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-600 mb-2">Interactive Network Map</div>
            <div className="text-sm text-gray-500">
              Real-time visualization of our global payment network infrastructure
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Nodes */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Regional Network Status</h3>
          <div className="space-y-3">
            {networkNodes.map((node, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium text-gray-900">{node.region}</div>
                    <div className="text-sm text-gray-500">{node.nodes} active nodes</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 capitalize">{node.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Uptime</div>
                    <div className="font-medium text-gray-900">{node.uptime}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Current TPS</div>
                    <div className="font-medium text-gray-900">{node.tps.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Supported Currencies */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Supported Currencies & Networks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportedCurrencies.map((currency, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{currency.flag}</span>
                    <div>
                      <div className="font-medium text-gray-900">{currency.code}</div>
                      <div className="text-sm text-gray-500">{currency.name}</div>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Network:</span>
                    <span className="font-medium text-gray-900">{currency.network}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Region:</span>
                    <span className="font-medium text-gray-900">{currency.countries}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partners */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Network Partners</h3>
            <div className="space-y-3">
              {partners.map((partner, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">{partner.name}</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{partner.type}</span>
                    <span className="text-gray-400">Since {partner.since}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-gray-700" />
              <h3 className="text-lg font-medium text-gray-900">Compliance & Security</h3>
            </div>
            <div className="space-y-3">
              {compliance.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">{item.standard}</div>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Network Performance (Last 24 Hours)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Transactions</div>
              <div className="text-2xl font-light text-gray-900">1.2M</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Volume</div>
              <div className="text-2xl font-light text-gray-900">$847M</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Peak TPS</div>
              <div className="text-2xl font-light text-gray-900">18,432</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Success Rate</div>
              <div className="text-2xl font-light text-gray-900">99.97%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

