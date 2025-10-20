'use client'

import React from 'react'
import { useAccount, useNetwork } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  checkContractDeploymentStatus, 
  getNetworkName, 
  isSupportedNetwork 
} from '@/lib/contracts/contract-config'
import { ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export function ContractStatus() {
  const { chain } = useNetwork()
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          请先连接钱包以查看合约状态
        </AlertDescription>
      </Alert>
    )
  }

  if (!chain) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          无法检测当前网络
        </AlertDescription>
      </Alert>
    )
  }

  const chainId = chain.id
  const isSupported = isSupportedNetwork(chainId)
  const status = checkContractDeploymentStatus(chainId)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            合约部署状态
            {status.allDeployed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </CardTitle>
          <CardDescription>
            当前网络: {status.network} (Chain ID: {chainId})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                当前网络不受支持。请切换到 Sepolia 测试网。
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* ZK Registry 状态 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">ZK-KYC 注册合约</h4>
                <Badge variant={status.zkRegistry.deployed ? "default" : "destructive"}>
                  {status.zkRegistry.deployed ? "已部署" : "未部署"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground break-all">
                {status.zkRegistry.address}
              </div>
              {status.zkRegistry.deployed && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://sepolia.etherscan.io/address/${status.zkRegistry.address}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  查看合约
                </Button>
              )}
            </div>

            {/* Asset Factory 状态 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">RWA 资产工厂</h4>
                <Badge variant={status.assetFactory.deployed ? "default" : "destructive"}>
                  {status.assetFactory.deployed ? "已部署" : "未部署"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground break-all">
                {status.assetFactory.address}
              </div>
              {status.assetFactory.deployed && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://sepolia.etherscan.io/address/${status.assetFactory.address}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  查看合约
                </Button>
              )}
            </div>
          </div>

          {!status.allDeployed && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>部分合约尚未部署或配置。请完成以下步骤：</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>在 Remix 中部署 ZKRWAAssetFactory 合约</li>
                    <li>更新 <code>lib/contracts/rwa-abis.ts</code> 中的合约地址</li>
                    <li>更新 ABI 配置</li>
                    <li>重新加载页面验证配置</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status.allDeployed && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                所有合约已正确部署和配置！RWA 平台已准备就绪。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ContractStatus
