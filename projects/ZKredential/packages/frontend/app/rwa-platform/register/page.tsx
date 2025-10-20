'use client'

import { useState } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Shield,
  ExternalLink,
  ArrowRight
} from 'lucide-react'
import { ZKRWARegistryContract } from '@/lib/contracts/zkrwa-registry-ethers'
import { ZKRWARegistryMultiPlatformContract } from '@/lib/contracts/zkrwa-registry-multiplatform'
import { BrowserProvider, JsonRpcSigner } from 'ethers'

interface ProofData {
  proof: {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    commitment: string
    nullifierHash: string
  }
  publicSignals: string[]
  platform: string
  address: string
  modules: {
    kyc: boolean
    asset: boolean
    aml: boolean
  }
  timestamp: number
}

export default function RegisterOnChainPage() {
  const router = useRouter()
  const { address, isConnected, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  
  const [uploadedProof, setUploadedProof] = useState<ProofData | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gasEstimate, setGasEstimate] = useState<string | null>(null)

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const proofData = JSON.parse(e.target?.result as string)
        
        // 验证证明结构
        if (!proofData.proof || !proofData.publicSignals) {
          throw new Error('无效的证明文件格式')
        }
        
        // 验证平台和公共信号数量
        const platform = proofData.platform || 'propertyfy'
        const expectedSignals = {
          'propertyfy': 12,
          'realt': 12,
          'realestate': 16
        }[platform]
        
        if (proofData.publicSignals.length !== expectedSignals) {
          throw new Error(`${platform} 平台期望 ${expectedSignals} 个公共信号，实际 ${proofData.publicSignals.length} 个`)
        }
        
        console.log(`✅ 证明文件有效 - 平台: ${platform}, 信号数: ${proofData.publicSignals.length}`)
        
        setUploadedProof(proofData)
        setError(null)
        setTxHash(null)
        
        // 估算 gas
        estimateGas(proofData)
      } catch (error) {
        console.error('解析证明文件失败:', error)
        setError(error instanceof Error ? error.message : '无效的证明文件格式')
      }
    }
    reader.readAsText(file)
  }

  // 估算 Gas
  const estimateGas = async (proofData: ProofData) => {
    if (!publicClient || !walletClient) {
      console.warn('无法估算 Gas: 缺少 provider 或 signer')
      return
    }

    try {
      // 创建 ethers provider 和 signer
      const provider = new BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()
      
      const registryContract = new ZKRWARegistryContract(
        provider,
        signer,
        chain?.id || 11155111
      )
      
      // 准备证明数据
      const zkProofData = {
        proof: proofData.proof,
        publicSignals: proofData.publicSignals
      }

      const providerName = "zk-kyc"
      const expiryTime = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 // 1年

      const estimate = await registryContract.estimateRegisterIdentityGas(
        zkProofData,
        providerName,
        expiryTime
      )

      setGasEstimate(estimate.toString())
    } catch (error) {
      console.error('估算 gas 失败:', error)
    }
  }

  // 注册到链上
  const registerOnChain = async () => {
    if (!uploadedProof || !address) {
      setError('请先上传证明文件并连接钱包')
      return
    }

    if (!publicClient || !walletClient) {
      setError('无法连接钱包，请重新连接')
      return
    }

    setIsRegistering(true)
    setError(null)

    try {
      // 创建 ethers provider 和 signer
      const provider = new BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()
      
      // 使用新的多平台合约
      const registryContract = new ZKRWARegistryMultiPlatformContract(
        provider,
        signer,
        chain?.id || 11155111
      )

      // 准备证明数据
      const zkProofData = {
        proof: uploadedProof.proof,
        publicSignals: uploadedProof.publicSignals,
        platform: uploadedProof.platform
      }

      // 从证明中提取平台
      const platform = uploadedProof.platform || 'propertyfy'
      const providerName = "zk-kyc"
      const expiryTime = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 // 1年

      console.log('正在注册身份到链上（多平台）...', { platform })
      
      const result = await registryContract.registerIdentity(
        zkProofData,
        platform,      // ← 传递平台参数
        providerName,
        expiryTime
      )

      console.log('注册成功！交易哈希:', result.hash)
      setTxHash(result.hash)

      // 延迟后跳转到 dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

    } catch (error: any) {
      console.error('链上注册失败:', error)
      
      let errorMessage = '链上注册失败'
      
      if (error.message?.includes('user rejected')) {
        errorMessage = '用户拒绝了交易'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = '余额不足，无法支付 gas 费用'
      } else if (error.message?.includes('Commitment already used')) {
        errorMessage = '该证明已被使用，请重新生成证明'
      } else if (error.message?.includes('Invalid proof')) {
        errorMessage = 'ZK 证明验证失败'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">链上身份注册</h1>
        <p className="text-muted-foreground text-lg">
          上传您的 ZK 证明文件，完成链上身份注册
        </p>
      </div>

      {/* 流程步骤 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            注册流程
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <span>生成证明</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <span>上传证明</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <span>链上注册</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 钱包连接状态 */}
      {!isConnected && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            请先连接钱包以继续操作
          </AlertDescription>
        </Alert>
      )}

      {/* 上传证明 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            上传 ZK 证明文件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="proof-upload"
            />
            <label
              htmlFor="proof-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium mb-1">
                  点击或拖拽上传证明文件
                </p>
                <p className="text-sm text-muted-foreground">
                  支持 .json 格式，从 /proof-generation 页面下载
                </p>
              </div>
            </label>
          </div>

          {uploadedProof && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">证明文件已上传</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>平台: {uploadedProof.platform}</p>
                <p>地址: {uploadedProof.address?.slice(0, 10)}...{uploadedProof.address?.slice(-8)}</p>
                <p>时间: {new Date(uploadedProof.timestamp).toLocaleString()}</p>
                <div className="flex gap-2 mt-2">
                  {uploadedProof.modules.kyc && <Badge variant="secondary">KYC ✓</Badge>}
                  {uploadedProof.modules.asset && <Badge variant="secondary">资产 ✓</Badge>}
                  {uploadedProof.modules.aml && <Badge variant="secondary">AML ✓</Badge>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gas 估算 */}
      {gasEstimate && (
        <Alert className="mb-6">
          <AlertDescription>
            <strong>估算 Gas:</strong> {gasEstimate}
          </AlertDescription>
        </Alert>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 注册按钮 */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={registerOnChain}
            disabled={!uploadedProof || !isConnected || isRegistering || !!txHash}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                正在注册到链上...
              </>
            ) : txHash ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                注册成功
              </>
            ) : (
              <>
                <Shield className="mr-2 h-5 w-5" />
                注册到链上
              </>
            )}
          </Button>

          {txHash && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-600">注册成功！</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>交易已提交到区块链</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-green-600">即将跳转到 Dashboard...</p>
              </div>
            </div>
          )}

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>还没有证明文件？</p>
            <Button
              variant="link"
              onClick={() => router.push('/proof-generation')}
              className="p-0 h-auto"
            >
              前往生成证明 →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

