'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Shield, 
  TrendingUp,
  AlertTriangle,
  Loader2,
  FileCheck,
  Wallet,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { VCStorageService } from '@/lib/services/vc-storage-service'
import { ProofGenerationService } from '@/lib/services/proof-generation-service'

// 验证模块类型
enum VerificationModule {
  KYC = 'kyc',
  ASSET = 'asset',
  AML = 'aml'
}

// 验证状态
interface ModuleStatus {
  completed: boolean
  loading: boolean
  error: string | null
  data: any | null
}

interface ProofGenerationState {
  kyc: ModuleStatus
  asset: ModuleStatus
  aml: ModuleStatus
  generatedProof: any | null
  isGeneratingProof: boolean
  proofError: string | null
}

export default function ProofGenerationPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  
  const [state, setState] = useState<ProofGenerationState>({
    kyc: { completed: false, loading: false, error: null, data: null },
    asset: { completed: false, loading: false, error: null, data: null },
    aml: { completed: false, loading: false, error: null, data: null },
    generatedProof: null,
    isGeneratingProof: false,
    proofError: null
  })

  const [vcStorage] = useState(() => new VCStorageService())
  const [proofService] = useState(() => new ProofGenerationService())
  const [selectedPlatform, setSelectedPlatform] = useState<string>('propertyfy')
  
  // 为每个平台单独存储证明状态
  const [platformProofs, setPlatformProofs] = useState<Record<string, any>>({
    propertyfy: null,
    realt: null,
    realestate: null
  })

  // 平台要求配置
  const platformRequirements = {
    propertyfy: {
      name: 'PropertyFy',
      modules: [VerificationModule.KYC, VerificationModule.ASSET],
      description: 'KYC + 资产验证',
      minAge: 21,
      minNetWorth: 50000,
      minIncome: 30000
    },
    realt: {
      name: 'RealT',
      modules: [VerificationModule.KYC, VerificationModule.AML],
      description: 'KYC + 反洗钱验证',
      minAge: 18,
      maxAMLRisk: 30
    },
    realestate: {  // ← 修复：统一为 'realestate' (与后端一致)
      name: 'RealestateIO',
      modules: [VerificationModule.KYC, VerificationModule.ASSET, VerificationModule.AML],
      description: 'KYC + 资产 + 反洗钱（完整合规）',
      minAge: 18,
      minNetWorth: 10000,
      maxAMLRisk: 40
    }
  }

  // 监听平台切换，更新证明状态
  useEffect(() => {
    // 从对应平台的证明存储中恢复证明
    const platformProof = platformProofs[selectedPlatform]
    setState(prev => ({
      ...prev,
      generatedProof: platformProof,
      proofError: null
    }))
    
    console.log(`Platform switched: ${selectedPlatform}`, {
      hasProof: !!platformProof,
      platform: selectedPlatform,
      platformName: platformRequirements[selectedPlatform as keyof typeof platformRequirements].name
    })
  }, [selectedPlatform, platformProofs])

  // 监听钱包地址变化，自动检测当前账号的状态
  useEffect(() => {
    // 先清除当前显示（防止闪烁显示旧数据）
    setPlatformProofs({
      propertyfy: null,
      realt: null,
      realestate: null
    })
    setState({
      kyc: { completed: false, loading: false, error: null, data: null },
      asset: { completed: false, loading: false, error: null, data: null },
      aml: { completed: false, loading: false, error: null, data: null },
      generatedProof: null,
      isGeneratingProof: false,
      proofError: null
    })
    
    if (!address) {
      console.log('Wallet disconnected, state cleared')
      return
    }
    
    console.log('Detecting account status:', address)
    
    // 只检查和加载**当前账号**的数据
    // 立即执行，不延迟
    const loadCurrentAccountData = () => {
      // 1. 检查当前账号的证明（按地址查找）
      const currentAccountProofs: Record<string, any> = {}
      
      for (const platform of ['propertyfy', 'realt', 'realestate']) {
        const key = `zk_proof_${platform}_${address}`  // 只查当前地址
        const saved = localStorage.getItem(key)
        
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            // 验证证明确实属于当前地址
            if (parsed.address === address && parsed.generatedAt && Date.now() - parsed.generatedAt < 24 * 60 * 60 * 1000) {
              currentAccountProofs[platform] = parsed
              console.log(`Account has proof for ${platform}`)
            } else {
              // 数据不匹配或过期，删除
              localStorage.removeItem(key)
              console.log(`Clearing invalid data: ${key}`)
            }
          } catch (e) {
            localStorage.removeItem(key) // 损坏的数据，删除
          }
        }
      }
      
      // 只更新当前账号有的证明
      if (Object.keys(currentAccountProofs).length > 0) {
        setPlatformProofs(currentAccountProofs)
        console.log('Loading account proofs:', Object.keys(currentAccountProofs))
      } else {
        console.log('No saved proofs for current account')
      }
      
      // 2. 检查当前账号的KYC状态
      const vcStatus = vcStorage.checkVCStatus(address)
      if (vcStatus.hasVC && vcStatus.isValid) {
        console.log('KYC verified for current account')
        setState(prev => ({
          ...prev,
          kyc: {
            completed: true,
            loading: false,
            error: null,
            data: vcStatus
          }
        }))
      } else {
        console.log('KYC not verified for current account')
      }
      
      // 3. 检查当前账号的资产验证
      const assetData = localStorage.getItem(`asset_verification_${address}`)
      if (assetData) {
        try {
          const parsed = JSON.parse(assetData)
          if (parsed.verified && parsed.expiresAt > Date.now()) {
            setState(prev => ({
              ...prev,
              asset: { completed: true, loading: false, error: null, data: parsed }
            }))
            console.log('Asset verification completed')
          }
        } catch (e) {
          localStorage.removeItem(`asset_verification_${address}`)
        }
      } else {
        console.log('Asset verification not completed')
      }
      
      // 4. 检查当前账号的AML验证
      const amlData = localStorage.getItem(`aml_verification_${address}`)
      if (amlData) {
        try {
          const parsed = JSON.parse(amlData)
          if (parsed.verified && parsed.expiresAt > Date.now()) {
            setState(prev => ({
              ...prev,
              aml: { completed: true, loading: false, error: null, data: parsed }
            }))
            console.log('AML verification completed')
          }
        } catch (e) {
          localStorage.removeItem(`aml_verification_${address}`)
        }
      } else {
        console.log('AML verification not completed')
      }
    }
    
    // 立即加载当前账号数据
    loadCurrentAccountData()
  }, [address, vcStorage])

  // 保存平台证明到 localStorage（当证明更新时）
  useEffect(() => {
    if (!address) return
    
    for (const platform of ['propertyfy', 'realt', 'realestate']) {
      const proof = platformProofs[platform]
      const key = `zk_proof_${platform}_${address}`
      
      if (proof) {
        localStorage.setItem(key, JSON.stringify(proof))
        console.log(`Saving proof for ${platform} to localStorage`)
      }
    }
  }, [platformProofs, address])

  // （验证状态检查已合并到上面的 useEffect 中）

  // 监听从百度KYC返回（检查URL参数）
  useEffect(() => {
    if (!address) return
    
    // 检查URL中的参数
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    const status = urlParams.get('status')
    
    if (sessionId && status === 'success') {
      console.log('Returned from Baidu KYC, refreshing status', { sessionId, address })
      
      // 延迟检查以确保localStorage已更新
      setTimeout(() => {
        const vcStatus = vcStorage.checkVCStatus(address)
        console.log('Checking KYC status', vcStatus)
        
        if (vcStatus.hasVC && vcStatus.isValid) {
          setState(prev => ({
            ...prev,
            kyc: {
              completed: true,
              loading: false,
              error: null,
              data: vcStatus
            }
          }))
          console.log('KYC status updated to completed')
        } else {
          console.warn('⚠️ KYC验证状态未找到或无效')
        }
      }, 1000) // 增加到1秒确保数据已保存
      
      // 清除URL参数
      window.history.replaceState({}, '', '/proof-generation')
    }
  }, [address, vcStorage])

  // 开始KYC验证
  const startKYCVerification = () => {
    router.push('/baidu-kyc?return_url=' + encodeURIComponent('/proof-generation'))
  }

  // 手动刷新KYC状态
  const refreshKYCStatus = () => {
    if (!address) return
    
    const vcStatus = vcStorage.checkVCStatus(address)
    console.log('Manual KYC status refresh', vcStatus)
    
    if (vcStatus.hasVC && vcStatus.isValid) {
      setState(prev => ({
        ...prev,
        kyc: {
          completed: true,
          loading: false,
          error: null,
          data: vcStatus
        }
      }))
      console.log('KYC status refreshed')
    }
  }

  // 清除当前钱包的所有证明和验证数据
  const clearAllData = () => {
    // 清除所有 zk_proof_ 开头的 key（所有账号的证明）
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('zk_proof_') || 
        key.startsWith('asset_verification_') || 
        key.startsWith('aml_verification_') ||
        key.startsWith('zkrwa_vc_storage_')
      )) {
        keysToRemove.push(key)
      }
    }
    
    // 删除所有匹配的 key
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    console.log('Cleared all account proofs and verification data', {
      清除数量: keysToRemove.length,
      清除的keys: keysToRemove
    })
    
    // 重置当前状态
    setPlatformProofs({
      propertyfy: null,
      realt: null,
      realestate: null
    })
    
    setState({
      kyc: { completed: false, loading: false, error: null, data: null },
      asset: { completed: false, loading: false, error: null, data: null },
      aml: { completed: false, loading: false, error: null, data: null },
      generatedProof: null,
      isGeneratingProof: false,
      proofError: null
    })
    
    alert('✅ 已清除所有历史数据！')
  }

  // 开始资产验证（模拟）
  const startAssetVerification = async () => {
    if (!address) return

    setState(prev => ({
      ...prev,
      asset: { ...prev.asset, loading: true, error: null }
    }))

    // 模拟资产验证流程
    setTimeout(() => {
      const assetData = {
        verified: true,
        netWorth: 100000,
        liquidAssets: 50000,
        income: 80000,
        isAccredited: true,
        verifiedAt: Date.now(),
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
      }

      localStorage.setItem(`asset_verification_${address}`, JSON.stringify(assetData))

      setState(prev => ({
        ...prev,
        asset: {
          completed: true,
          loading: false,
          error: null,
          data: assetData
        }
      }))
    }, 2000)
  }

  // 开始AML验证（模拟）
  const startAMLVerification = async () => {
    if (!address) return

    setState(prev => ({
      ...prev,
      aml: { ...prev.aml, loading: true, error: null }
    }))

    // 模拟AML验证流程
    setTimeout(() => {
      const amlData = {
        verified: true,
        riskScore: 15,
        isOnSanctions: false,
        isPEP: false,
        fundsVerified: true,
        transactionScore: 85,
        verifiedAt: Date.now(),
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
      }

      localStorage.setItem(`aml_verification_${address}`, JSON.stringify(amlData))

      setState(prev => ({
        ...prev,
        aml: {
          completed: true,
          loading: false,
          error: null,
          data: amlData
        }
      }))
    }, 2000)
  }

  // 生成ZK证明
  const generateProof = async () => {
    if (!address) return

    const platform = platformRequirements[selectedPlatform as keyof typeof platformRequirements]
    const requiredModules = platform.modules

    // 检查所有必需模块是否已完成
    const allCompleted = requiredModules.every(module => state[module].completed)
    if (!allCompleted) {
      setState(prev => ({
        ...prev,
        proofError: '请先完成所有必需的验证模块'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isGeneratingProof: true,
      proofError: null
    }))

    try {
      // 获取VC数据
      const userVCData = vcStorage.getVCStorage(address)
      if (!userVCData?.vc) {
        throw new Error('未找到VC凭证')
      }

      // 生成证明请求（带平台参数）
      const proofRequest = {
        vc: userVCData.vc,
        requirements: {
          platform: selectedPlatform,  // 传递平台参数
          minAge: platform.minAge || 18,
          allowedCountries: ['CN'],
          minAssets: platform.minNetWorth || 0
        },
        walletAddress: address,
        nonce: Math.random().toString(36),
        platform: selectedPlatform  // ← 添加顶级平台参数
      }

      console.log('Generating proof - platform:', selectedPlatform, 'modules:', platform.modules)
      
      const proof = await proofService.generateProofFromVC(proofRequest)

      // 为证明添加平台标识
      const platformSpecificProof = {
        ...proof,
        platform: selectedPlatform,
        platformName: platform.name,
        modules: platform.modules,
        generatedAt: Date.now()
      }

      // 更新对应平台的证明
      setPlatformProofs(prev => ({
        ...prev,
        [selectedPlatform]: platformSpecificProof
      }))

      setState(prev => ({
        ...prev,
        generatedProof: platformSpecificProof,
        isGeneratingProof: false
      }))

      console.log(`${platform.name} proof generated successfully`, {
        platform: selectedPlatform,
        hasProof: true,
        timestamp: platformSpecificProof.generatedAt
      })

    } catch (error: any) {
      console.error('证明生成失败:', error)
      setState(prev => ({
        ...prev,
        isGeneratingProof: false,
        proofError: error.message || '证明生成失败'
      }))
    }
  }

  // 下载证明
  const downloadProof = () => {
    if (!state.generatedProof) return

    // state.generatedProof 是 EnhancedZKProof 类型，包含 proof 和 publicSignals
    const proofData = {
      // 提取 Groth16 证明结构
      proof: state.generatedProof.proof,
      // 提取公开信号数组
      publicSignals: state.generatedProof.publicSignals,
      // 平台特定元数据
      platform: state.generatedProof.platform || selectedPlatform,
      platformName: state.generatedProof.platformName,
      modules: state.generatedProof.modules || [],
      generatedAt: state.generatedProof.generatedAt,
      // 其他元数据
      address,
      timestamp: state.generatedProof.timestamp,
      commitment: state.generatedProof.commitment,
      proofHash: state.generatedProof.proofHash,
      expiresAt: state.generatedProof.expiresAt
    }

    console.log('Downloading proof data:', {
      hasProof: !!proofData.proof,
      hasPublicSignals: !!proofData.publicSignals,
      publicSignalsCount: proofData.publicSignals?.length,
      proofProtocol: proofData.proof?.protocol,
      platform: proofData.platform,
      timestamp: new Date(proofData.timestamp).toLocaleString()
    })

    const blob = new Blob([JSON.stringify(proofData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zk-proof-${selectedPlatform}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 计算总体进度
  const calculateProgress = () => {
    const platform = platformRequirements[selectedPlatform as keyof typeof platformRequirements]
    const requiredModules = platform.modules
    const completedCount = requiredModules.filter(module => state[module].completed).length
    return (completedCount / requiredModules.length) * 100
  }

  if (!isConnected) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8 min-h-screen">
        <Card className="barca-card">
          <CardContent className="text-center py-16">
            <Wallet className="w-20 h-20 mx-auto mb-6 text-[#004e98]" />
            <h2 className="text-3xl font-bold mb-3">
              <span className="barca-gradient-text">请连接钱包</span>
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">连接钱包以开始生成零知识证明</p>
            <Button onClick={() => router.push('/')} className="btn-barca-primary px-8">
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const platform = platformRequirements[selectedPlatform as keyof typeof platformRequirements]

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 min-h-screen bg-transparent">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-3">
              <span className="barca-gradient-text">ZK 证明生成中心</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              根据不同 RWA 平台的要求，完成相应的验证模块并生成零知识证明
            </p>
          </div>
          {address && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAllData}
              className="status-error hover:bg-[#dc0036] hover:text-white transition-colors"
            >
              清除所有数据
            </Button>
          )}
        </div>
      </div>

      {/* 平台选择 */}
      <Card className="mb-8 barca-card barca-card-glow">
        <CardHeader>
          <CardTitle className="text-xl">
            <span className="barca-gradient-text">选择目标平台</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(platformRequirements).map(([key, req]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-barca-blue ${
                  selectedPlatform === key 
                    ? 'border-[#004e98] border-2 bg-[#004e98]/5' 
                    : 'border-border hover:border-[#004e98]/50'
                }`}
                onClick={() => setSelectedPlatform(key)}
              >
                <CardContent className="pt-6">
                  <h3 className="font-bold mb-2 text-lg">{req.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{req.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {req.modules.map(module => (
                      <Badge key={module} className="barca-badge-blue text-xs">
                        {module.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 总体进度 */}
      <Card className="mb-8 border-[#eebd01]/30 bg-[#eebd01]/5">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-base font-bold text-[#004e98]">总体进度</span>
            <span className="text-lg font-bold barca-gradient-gold">{calculateProgress().toFixed(0)}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-4" />
        </CardContent>
      </Card>

      {/* 验证模块（并行显示） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* KYC验证 */}
        <Card className={`${platform.modules.includes(VerificationModule.KYC) ? '' : 'opacity-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              KYC验证
              {state.kyc.completed && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {platform.modules.includes(VerificationModule.KYC) ? (
              <>
                <div className="text-sm text-gray-600">
                  验证身份信息、年龄和国籍
                </div>
                
                {state.kyc.completed ? (
                  <div className="space-y-2">
                    <div className="status-verified">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">已完成</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {state.kyc.data?.createdAt && (
                        <div>完成时间: {new Date(state.kyc.data.createdAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      onClick={startKYCVerification}
                      disabled={state.kyc.loading}
                      className="w-full btn-barca-primary"
                    >
                      {state.kyc.loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 验证中...</>
                      ) : (
                        '开始 KYC 验证'
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={refreshKYCStatus}
                      className="w-full text-xs hover:border-[#004e98]"
                    >
                      刷新状态
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">此平台不需要此模块</div>
            )}
          </CardContent>
        </Card>

        {/* 资产验证 */}
        <Card className={`${platform.modules.includes(VerificationModule.ASSET) ? '' : 'opacity-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              资产验证
              {state.asset.completed && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {platform.modules.includes(VerificationModule.ASSET) ? (
              <>
                <div className="text-sm text-gray-600">
                  验证净资产、流动资产和收入
                </div>
                
                {state.asset.completed ? (
                  <div className="space-y-2">
                    <div className="status-verified">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">已完成</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {state.asset.data && (
                        <>
                          <div>净资产: ${state.asset.data.netWorth?.toLocaleString()}</div>
                          <div>流动资产: ${state.asset.data.liquidAssets?.toLocaleString()}</div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button 
                    onClick={startAssetVerification}
                    disabled={state.asset.loading}
                    className="w-full btn-barca-primary"
                  >
                    {state.asset.loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 验证中...</>
                    ) : (
                      '开始资产验证'
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">此平台不需要此模块</div>
            )}
          </CardContent>
        </Card>

        {/* AML验证 */}
        <Card className={`${platform.modules.includes(VerificationModule.AML) ? '' : 'opacity-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              反洗钱验证
              {state.aml.completed && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {platform.modules.includes(VerificationModule.AML) ? (
              <>
                <div className="text-sm text-gray-600">
                  验证AML风险评分和资金来源
                </div>
                
                {state.aml.completed ? (
                  <div className="space-y-2">
                    <div className="status-verified">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">已完成</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {state.aml.data && (
                        <>
                          <div>风险评分: {state.aml.data.riskScore}/100</div>
                          <div>交易评分: {state.aml.data.transactionScore}/100</div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button 
                    onClick={startAMLVerification}
                    disabled={state.aml.loading}
                    className="w-full btn-barca-primary"
                  >
                    {state.aml.loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 验证中...</>
                    ) : (
                      '开始 AML 验证'
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">此平台不需要此模块</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 错误提示 */}
      {state.proofError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.proofError}</AlertDescription>
        </Alert>
      )}

      {/* 生成证明按钮 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            生成ZK证明
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            完成所有必需的验证模块后，即可生成隐私保护的零知识证明
          </div>
          
          {state.generatedProof ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <div className="font-semibold mb-1">
                    {state.generatedProof.platformName || platform.name} 证明生成成功！
                  </div>
                  <div className="text-xs text-green-600">
                    验证模块: {(state.generatedProof.modules || platform.modules).join(' + ')}
                  </div>
                  {state.generatedProof.generatedAt && (
                    <>
                      <div className="text-xs text-green-600 mt-1" suppressHydrationWarning>
                        生成时间: {new Date(state.generatedProof.generatedAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-xs text-amber-600 mt-2" suppressHydrationWarning>
                        ⚠️ 证明有效期：生成后 5 分钟内
                        {Date.now() - state.generatedProof.generatedAt > 4 * 60 * 1000 && (
                          <span className="text-red-600 font-semibold ml-2">即将过期，请尽快使用或重新生成！</span>
                        )}
                      </div>
                    </>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button onClick={downloadProof} className="w-full btn-barca-gold">
                  <Download className="mr-2 h-4 w-4" />
                  下载证明文件
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // 重新生成证明
                    setState(prev => ({
                      ...prev,
                      generatedProof: null,
                      proofError: null
                    }))
                    // 清除对应平台的证明
                    setPlatformProofs(prev => ({
                      ...prev,
                      [selectedPlatform]: null
                    }))
                    console.log('Proof cleared, ready to regenerate')
                  }}
                  className="w-full hover:border-[#004e98] hover:text-[#004e98]"
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  重新生成证明
                </Button>
                <Button 
                  onClick={() => router.push(`/rwa-platform/register`)}
                  className="w-full btn-barca-primary"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  前往链上注册
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={generateProof}
              disabled={state.isGeneratingProof || calculateProgress() < 100}
              className="w-full btn-barca-primary text-lg py-6"
              size="lg"
            >
              {state.isGeneratingProof ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 生成中...</>
              ) : (
                `生成${platform.name}平台证明`
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



