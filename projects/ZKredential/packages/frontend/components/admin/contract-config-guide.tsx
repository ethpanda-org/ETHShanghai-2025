'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, FileText, Settings } from 'lucide-react'
import { toast } from 'sonner'

export function ContractConfigGuide() {
  const [factoryAddress, setFactoryAddress] = useState('')
  const [tokenAbi, setTokenAbi] = useState('')
  const [factoryAbi, setFactoryAbi] = useState('')

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} 已复制到剪贴板`)
  }

  const generateConfigCode = () => {
    return `// 更新 lib/contracts/rwa-abis.ts

export const ZKRWA_TOKEN_ABI = ${tokenAbi || '[]'} as const;

export const ZKRWA_ASSET_FACTORY_ABI = ${factoryAbi || '[]'} as const;

export const RWA_CONTRACT_ADDRESSES = {
  sepolia: {
    assetFactory: "${factoryAddress || '0x0000000000000000000000000000000000000000'}",
    sampleAssets: {
      realEstate: "0x0000000000000000000000000000000000000000",
      commodity: "0x0000000000000000000000000000000000000000"
    }
  },
  mainnet: {
    assetFactory: "0x0000000000000000000000000000000000000000",
    sampleAssets: {}
  }
} as const;`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            合约配置指南
          </CardTitle>
          <CardDescription>
            按照以下步骤配置您在 Remix 中部署的合约
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deploy" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deploy">部署步骤</TabsTrigger>
              <TabsTrigger value="config">配置更新</TabsTrigger>
              <TabsTrigger value="verify">验证测试</TabsTrigger>
            </TabsList>

            <TabsContent value="deploy" className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Remix 部署步骤：</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>打开 Remix IDE (remix.ethereum.org)</li>
                      <li>创建新文件夹 "zk-rwa-contracts"</li>
                      <li>复制以下合约文件到 Remix：
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>contracts/interfaces/IZKRWARegistry.sol</li>
                          <li>contracts/ZKRWAToken.sol</li>
                          <li>contracts/ZKRWAAssetFactory.sol</li>
                        </ul>
                      </li>
                      <li>编译合约 (Solidity 0.8.19)</li>
                      <li>连接到 Sepolia 测试网</li>
                      <li>首先部署 ZKRWAAssetFactory 合约</li>
                      <li>记录部署的合约地址</li>
                      <li>从 Remix 复制 ABI (编译后的 artifacts)</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="factory-address">Asset Factory 合约地址</Label>
                  <Input
                    id="factory-address"
                    placeholder="0x..."
                    value={factoryAddress}
                    onChange={(e) => setFactoryAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token-abi">ZKRWAToken ABI (从 Remix 复制)</Label>
                  <Textarea
                    id="token-abi"
                    placeholder="粘贴 ZKRWAToken 的 ABI JSON..."
                    value={tokenAbi}
                    onChange={(e) => setTokenAbi(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="factory-abi">ZKRWAAssetFactory ABI (从 Remix 复制)</Label>
                  <Textarea
                    id="factory-abi"
                    placeholder="粘贴 ZKRWAAssetFactory 的 ABI JSON..."
                    value={factoryAbi}
                    onChange={(e) => setFactoryAbi(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label>生成的配置代码</Label>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                      <code>{generateConfigCode()}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generateConfigCode(), '配置代码')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <p className="font-medium mb-2">更新步骤：</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>复制上面生成的配置代码</li>
                      <li>打开 <code>lib/contracts/rwa-abis.ts</code> 文件</li>
                      <li>替换相应的 ABI 和地址配置</li>
                      <li>保存文件并重新加载页面</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="verify" className="space-y-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">配置完成后的验证步骤：</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>重新加载页面</li>
                      <li>检查合约状态组件显示"已部署"</li>
                      <li>访问 RWA 平台页面</li>
                      <li>测试资产列表加载</li>
                      <li>测试投资流程（需要先完成 KYC）</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>测试用的示例资产创建参数</Label>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`{
  "name": "测试房地产资产",
  "symbol": "TRE",
  "platform": "高端投资平台",
  "assetInfo": {
    "name": "上海陆家嘴写字楼",
    "location": "上海市浦东新区",
    "totalValue": "1.0",
    "assetType": "商业地产",
    "expectedReturn": 800,
    "description": "位于陆家嘴核心区域的甲级写字楼"
  },
  "tokenPrice": "0.01",
  "maxSupply": "100"
}`}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(`{
  "name": "测试房地产资产",
  "symbol": "TRE", 
  "platform": "高端投资平台",
  "assetInfo": {
    "name": "上海陆家嘴写字楼",
    "location": "上海市浦东新区",
    "totalValue": "1.0",
    "assetType": "商业地产",
    "expectedReturn": 800,
    "description": "位于陆家嘴核心区域的甲级写字楼"
  },
  "tokenPrice": "0.01",
  "maxSupply": "100"
}`, '测试参数')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  复制测试参数
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default ContractConfigGuide
