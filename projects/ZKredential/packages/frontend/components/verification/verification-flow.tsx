'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wallet, 
  FileText, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  ExternalLink,
  Clock
} from 'lucide-react'
import { VCStorageService } from '@/lib/services/vc-storage-service'

enum VerificationStep {
  CONNECT_WALLET = 1,
  KYC_VERIFICATION = 2,
  GENERATE_PROOF = 3,
  REGISTER_ONCHAIN = 4,
  COMPLETE = 5
}

interface VerificationState {
  currentStep: VerificationStep
  isProcessing: boolean
  error: string | null
  zkProof: any | null
  commitment: string | null
  txHash: string | null
  isRenewal?: boolean
  originalExpiry?: number
}

interface VerificationFlowProps {
  state: VerificationState
  setState: React.Dispatch<React.SetStateAction<VerificationState>>
  isConnected: boolean
  address: string | undefined
  onComplete: () => void
}

export function VerificationFlow({ 
  state, 
  setState, 
  isConnected, 
  address, 
  onComplete 
}: VerificationFlowProps) {
  const router = useRouter()
  
  const [zkServerStatus, setZkServerStatus] = useState<{
    isHealthy: boolean
    isChecking: boolean
    lastChecked: Date | null
  }>({
    isHealthy: false,
    isChecking: false,
    lastChecked: null
  })

  // 检查ZK服务器状态
  const checkZKServerStatus = async () => {
    console.log('🔍 开始检查ZK服务器状态...')
    setZkServerStatus(prev => ({ ...prev, isChecking: true }))
    
    try {
      const response = await fetch('/api/proof/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '0x0000000000000000000000000000000000000000',
          credentialData: {}
        })
      })
      
      console.log('📡 ZK服务器响应状态:', response.status)
      const isHealthy = response.status !== 503
      
      setZkServerStatus({
        isHealthy,
        isChecking: false,
        lastChecked: new Date()
      })
      
      console.log('✅ ZK服务器状态检查完成:', { isHealthy })
    } catch (error) {
      console.error('❌ ZK服务器状态检查失败:', error)
      setZkServerStatus({
        isHealthy: false,
        isChecking: false,
        lastChecked: new Date()
      })
    }
  }

  // 页面加载时检查ZK服务器状态
  useEffect(() => {
    checkZKServerStatus()
  }, [])

  // 检查钱包连接状态
  useEffect(() => {
    if (isConnected && address) {
      setState(prev => ({
        ...prev,
        currentStep: VerificationStep.KYC_VERIFICATION,
        error: null
      }))
      
      // 检查是否已有VC
      checkExistingVC()
    } else {
      setState(prev => ({
        ...prev,
        currentStep: VerificationStep.CONNECT_WALLET
      }))
    }
  }, [isConnected, address])

  // 检查现有VC状态
  const checkExistingVC = () => {
    if (!address) return
    
    const vcStorage = new VCStorageService()
    const vcStatus = vcStorage.checkVCStatus(address)
    
    if (vcStatus.hasVC && vcStatus.isValid) {
      console.log('✅ 发现有效的VC，跳过KYC步骤')
      setState(prev => ({
        ...prev,
        currentStep: VerificationStep.GENERATE_PROOF
      }))
    }
  }

  // 开始KYC验证
  const startKYC = () => {
    const sessionId = `baidu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    router.push(`/baidu-kyc?session=${sessionId}`)
  }

  // 生成ZK证明
  const generateZKProof = async () => {
    if (!address) return
    
    console.log('🔧 开始生成ZK证明流程...')
    setState(prev => ({ ...prev, isProcessing: true, error: null }))
    
    try {
      console.log('🔧 开始生成ZK证明...')
      
      // 从localStorage获取VC数据
      const vcStorage = new VCStorageService()
      const userVCData = vcStorage.getVCStorage(address)
      
      if (!userVCData || !userVCData.vc) {
        throw new Error('未找到VC凭证，请先完成KYC验证')
      }

      const response = await fetch('/api/proof/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          credentialData: userVCData.vc.credentialSubject
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        let errorMessage = data.error || 'ZK证明生成失败'
        let errorDetails = data.details || ''
        let suggestion = data.suggestion || ''
        
        if (response.status === 503) {
          errorMessage = '⚠️ ZK证明服务器不可用'
          errorDetails = data.details || '请确保ZK服务器正在运行'
          suggestion = data.suggestion || "请运行 'npm run zk-server' 启动ZK证明服务器"
        } else if (response.status === 502) {
          errorMessage = '⚠️ ZK服务器响应错误'
          errorDetails = data.details || 'ZK服务器可能正在重启'
        }
        
        const fullError = `${errorMessage}${errorDetails ? '\n详情: ' + errorDetails : ''}${suggestion ? '\n建议: ' + suggestion : ''}`
        throw new Error(fullError)
      }

      console.log('✅ ZK证明生成成功')
      console.log('📊 性能信息:', data.proof.performance)
      
      setState(prev => ({
        ...prev,
        zkProof: {
          ...data.proof.zkProof,
          publicSignals: data.proof.publicSignals
        },
        commitment: data.proof.commitment,
        currentStep: VerificationStep.REGISTER_ONCHAIN,
        isProcessing: false
      }))
      
    } catch (error) {
      console.error('❌ ZK证明生成失败:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'ZK证明生成失败',
        isProcessing: false
      }))
    }
  }

  // 链上注册
  const registerOnChain = async () => {
    if (!address || !state.zkProof || !state.commitment) return
    
    setState(prev => ({ ...prev, isProcessing: true, error: null }))
    
    try {
      console.log('🔧 开始链上注册 (使用 ethers.js v6)...')
      
      const { ethers } = await import('ethers')
      const { createZKRWARegistryContract } = await import('@/lib/contracts/zkrwa-registry-ethers')
      
      if (!window.ethereum) {
        throw new Error('请安装MetaMask钱包')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      const network = await provider.getNetwork()
      console.log('🌐 当前网络:', { 
        chainId: network.chainId.toString(), 
        name: network.name 
      })
      
      if (network.chainId !== BigInt(11155111)) {
        throw new Error('请切换到Sepolia测试网络')
      }

      const registry = await createZKRWARegistryContract(provider, signer, 11155111)

      const proofData = {
        zkProof: {
          pi_a: state.zkProof.pi_a,
          pi_b: state.zkProof.pi_b,
          pi_c: state.zkProof.pi_c,
          protocol: state.zkProof.protocol,
          curve: state.zkProof.curve
        },
        publicSignals: state.zkProof.publicSignals
      }

      console.log('📝 准备链上注册:', {
        address,
        commitment: state.commitment,
        contractAddress: registry.address
      })

      // 调用合约注册 - 设置更长的有效期
      const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1年后过期
      const result = await registry.registerIdentity(
        proofData,
        'baidu',
        expiresAt
      )

      console.log('✅ 链上注册成功:', result)
      
      setState(prev => ({
        ...prev,
        txHash: result.hash,
        currentStep: VerificationStep.COMPLETE,
        isProcessing: false
      }))
      
    } catch (error: any) {
      console.error('❌ 链上注册失败:', error)
      
      let errorMessage = '链上注册失败'
      if (error.code === 'NETWORK_ERROR') {
        errorMessage = '网络连接错误，请检查网络设置'
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = '余额不足，请确保有足够的ETH支付Gas费用'
      } else if (error.code === 'ACTION_REJECTED') {
        errorMessage = '用户取消了交易'
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = '合约执行失败，请检查参数是否正确'
      } else if (error.message?.includes('switch')) {
        errorMessage = '请切换到Sepolia测试网络'
      } else {
        errorMessage = error.message || '链上注册失败'
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isProcessing: false
      }))
    }
  }

  const progress = ((state.currentStep - 1) / (Object.keys(VerificationStep).length / 2 - 1)) * 100

  return (
    <div className="space-y-6">
      {/* 进度条 */}
      <Card>
        <CardContent className="pt-6">
          <Progress value={progress} className="mb-4" />
          <p className="text-center text-sm text-muted-foreground">
            步骤 {state.currentStep} / 5
          </p>
        </CardContent>
      </Card>

      {/* ZK服务器状态显示 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${zkServerStatus.isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              ZK证明服务器: {zkServerStatus.isHealthy ? '在线' : '离线'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {zkServerStatus.lastChecked && (
              <span className="text-xs text-muted-foreground">
                最后检查: {zkServerStatus.lastChecked.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={checkZKServerStatus}
              disabled={zkServerStatus.isChecking}
            >
              {zkServerStatus.isChecking ? '检查中...' : '刷新'}
            </Button>
          </div>
        </div>
        {!zkServerStatus.isHealthy && (
          <div className="mt-2 text-sm text-muted-foreground">
            <p>⚠️ ZK证明服务器不可用，请确保服务器正在运行</p>
            <p className="text-xs mt-1">运行命令: <code className="bg-muted px-1 rounded">npm run zk-server</code></p>
          </div>
        )}
      </div>

      {/* 步骤内容 */}
      <div className="grid gap-6">
        {/* 步骤1: 连接钱包 */}
        <Card className={state.currentStep === VerificationStep.CONNECT_WALLET ? 'border-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Wallet className="w-5 h-5" />
              )}
              步骤1: 连接钱包
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <div className="space-y-2">
                <p className="text-green-600">✅ 钱包已连接</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {address}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">钱包连接将在页面级别处理</p>
            )}
          </CardContent>
        </Card>

        {/* 步骤2: KYC验证 */}
        <Card className={state.currentStep === VerificationStep.KYC_VERIFICATION ? 'border-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {state.currentStep > VerificationStep.KYC_VERIFICATION ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              步骤2: KYC身份验证
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.currentStep === VerificationStep.KYC_VERIFICATION ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  使用百度AI进行身份验证，上传身份证和自拍照片
                </p>
                <Button 
                  onClick={startKYC}
                  disabled={!isConnected}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  开始KYC验证
                </Button>
              </div>
            ) : state.currentStep > VerificationStep.KYC_VERIFICATION ? (
              <p className="text-green-600">✅ KYC验证已完成</p>
            ) : (
              <p className="text-muted-foreground">请先连接钱包</p>
            )}
          </CardContent>
        </Card>

        {/* 步骤3: 生成ZK证明 */}
        <Card className={state.currentStep === VerificationStep.GENERATE_PROOF ? 'border-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {state.currentStep > VerificationStep.GENERATE_PROOF ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              步骤3: 生成ZK证明
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.currentStep === VerificationStep.GENERATE_PROOF ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  基于您的身份信息生成零知识证明，保护隐私的同时证明合规性
                </p>
                <Button 
                  onClick={() => {
                    console.log('🔘 生成ZK证明按钮被点击')
                    console.log('📊 当前状态:', { 
                      isProcessing: state.isProcessing, 
                      zkServerHealthy: zkServerStatus.isHealthy,
                      address 
                    })
                    generateZKProof()
                  }}
                  disabled={state.isProcessing || !zkServerStatus.isHealthy}
                  className="w-full"
                >
                  {state.isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : !zkServerStatus.isHealthy ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      ZK服务器离线
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      生成ZK证明
                    </>
                  )}
                </Button>
              </div>
            ) : state.currentStep > VerificationStep.GENERATE_PROOF ? (
              <div className="space-y-2">
                <p className="text-green-600">✅ ZK证明已生成</p>
                {state.commitment && (
                  <p className="text-sm text-muted-foreground font-mono">
                    Commitment: {state.commitment.substring(0, 20)}...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">请先完成KYC验证</p>
            )}
          </CardContent>
        </Card>

        {/* 步骤4: 链上注册 */}
        <Card className={state.currentStep === VerificationStep.REGISTER_ONCHAIN ? 'border-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {state.currentStep > VerificationStep.REGISTER_ONCHAIN ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
              步骤4: 链上注册
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.currentStep === VerificationStep.REGISTER_ONCHAIN ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  将您的身份证明注册到区块链，需要支付少量Gas费用
                </p>
                <Button 
                  onClick={registerOnChain}
                  disabled={state.isProcessing}
                  className="w-full"
                >
                  {state.isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  注册到区块链
                </Button>
              </div>
            ) : state.currentStep > VerificationStep.REGISTER_ONCHAIN ? (
              <div className="space-y-2">
                <p className="text-green-600">✅ 链上注册已完成</p>
                {state.txHash && (
                  <p className="text-sm text-muted-foreground font-mono">
                    交易哈希: {state.txHash.substring(0, 20)}...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">请先生成ZK证明</p>
            )}
          </CardContent>
        </Card>

        {/* 步骤5: 完成 */}
        {state.currentStep === VerificationStep.COMPLETE && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                验证完成！
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  🎉 恭喜！您已成功完成身份验证并生成了零知识证明。
                  现在可以在支持的RWA平台上进行投资了。
                </p>
                <Button 
                  onClick={onComplete}
                  className="w-full"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  查看验证状态
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}








