'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck,
  Shield,
  TrendingUp,
  AlertTriangle,
  Clock,
  User,
  ArrowRight
} from 'lucide-react'

interface VerificationResult {
  valid: boolean
  platform: string
  address: string
  modules: {
    kyc: boolean
    asset: boolean
    aml: boolean
  }
  timestamp: number
  commitment: string
  error?: string
}

export default function VerifyProofPage() {
  const router = useRouter()
  const [uploadedProof, setUploadedProof] = useState<any>(null)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const proofData = JSON.parse(e.target?.result as string)
        setUploadedProof(proofData)
        setVerificationResult(null)
      } catch (error) {
        console.error('解析证明文件失败:', error)
        alert('无效的证明文件格式')
      }
    }
    reader.readAsText(file)
  }

  // 验证证明
  const verifyProof = async () => {
    if (!uploadedProof) return

    setIsVerifying(true)

    try {
      console.log('🔍 开始链下验证...')

      // 1. 验证证明结构
      if (!uploadedProof.proof || !uploadedProof.publicSignals) {
        throw new Error('证明数据不完整：缺少 proof 或 publicSignals')
      }

      if (!uploadedProof.platform || !uploadedProof.address) {
        throw new Error('证明数据不完整：缺少 platform 或 address')
      }

      // 验证公共信号数量
      const platform = uploadedProof.platform || 'propertyfy'
      const expectedSignals = {
        'propertyfy': 12,
        'realt': 12,
        'realestate': 16
      }[platform]
      
      if (uploadedProof.publicSignals.length !== expectedSignals) {
        throw new Error(`${platform} 平台期望 ${expectedSignals} 个公共信号，实际 ${uploadedProof.publicSignals.length} 个`)
      }

      console.log(`✅ 证明结构检查通过 (平台: ${platform}, 信号数: ${uploadedProof.publicSignals.length})`)

      // 2. 验证时间戳（证明不能太旧）
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7天
      const age = Date.now() - uploadedProof.timestamp
      if (age > maxAge) {
        throw new Error('证明已过期（超过7天）')
      }

      console.log('✅ 时间戳检查通过')

      // 3. 调用 Next.js API 进行真实的 ZK 验证
      console.log(`🔐 调用 ZK 电路验证 (${platform} 平台)...`)
      
      const response = await fetch('/api/proof/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof: uploadedProof.proof,
          publicSignals: uploadedProof.publicSignals,
          platform: platform  // ← 传递平台参数
        })
      })

      if (!response.ok) {
        throw new Error(`验证请求失败: ${response.status} ${response.statusText}`)
      }

      const verifyResult = await response.json()
      console.log('📊 验证结果:', verifyResult)

      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'ZK 证明验证失败')
      }

      if (!verifyResult.verified) {
        throw new Error('ZK 证明验证未通过：证明不符合电路约束')
      }

      console.log('✅ ZK 电路验证通过')

      // 4. 验证成功，返回结果
      const result: VerificationResult = {
        valid: true,
        platform: uploadedProof.platform,
        address: uploadedProof.address,
        modules: uploadedProof.modules || { kyc: true, asset: true, aml: false },
        timestamp: uploadedProof.timestamp,
        commitment: uploadedProof.publicSignals?.[0] || uploadedProof.proof?.commitment || 'N/A'
      }

      console.log('🎉 链下验证完成:', result)
      setVerificationResult(result)

    } catch (error: any) {
      console.error('❌ 验证失败:', error)
      setVerificationResult({
        valid: false,
        platform: uploadedProof.platform || 'unknown',
        address: uploadedProof.address || 'unknown',
        modules: { kyc: false, asset: false, aml: false },
        timestamp: Date.now(),
        commitment: 'N/A',
        error: error.message || '验证失败'
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">RWA平台证明验证</h1>
        <p className="text-gray-600">
          上传ZK证明文件进行链下验证
        </p>
      </div>

      {/* 上传证明 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传证明文件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="proof-upload"
            />
            <label
              htmlFor="proof-upload"
              className="cursor-pointer"
            >
              <FileCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <div className="text-lg font-medium mb-2">
                {uploadedProof ? '已上传证明文件' : '点击或拖拽文件上传'}
              </div>
              <div className="text-sm text-gray-500">
                支持 JSON 格式的证明文件
              </div>
              {uploadedProof && (
                <Badge className="mt-4 bg-blue-100 text-blue-800">
                  {uploadedProof.platform} - {new Date(uploadedProof.timestamp).toLocaleString()}
                </Badge>
              )}
            </label>
          </div>

          {uploadedProof && !verificationResult && (
            <Button 
              onClick={verifyProof}
              disabled={isVerifying}
              className="w-full"
              size="lg"
            >
              {isVerifying ? '验证中...' : '验证证明'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 验证结果 */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verificationResult.valid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  验证通过
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  验证失败
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {verificationResult.valid ? (
              <>
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    零知识证明验证成功！用户满足平台要求，且未泄露任何隐私信息。
                  </AlertDescription>
                </Alert>

                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">目标平台</div>
                    <div className="font-semibold capitalize">{verificationResult.platform}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">用户地址</div>
                    <div className="font-mono text-sm">
                      {verificationResult.address.substring(0, 10)}...
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">验证时间</div>
                    <div className="font-semibold">
                      {new Date(verificationResult.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Commitment</div>
                    <div className="font-mono text-xs">
                      {verificationResult.commitment.substring(0, 20)}...
                    </div>
                  </div>
                </div>

                {/* 验证模块 */}
                <div>
                  <div className="text-sm font-medium mb-3">已验证模块</div>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className={verificationResult.modules.kyc ? 'border-green-500' : 'opacity-50'}>
                      <CardContent className="pt-6 text-center">
                        <Shield className={`w-8 h-8 mx-auto mb-2 ${verificationResult.modules.kyc ? 'text-green-500' : 'text-gray-400'}`} />
                        <div className="font-medium text-sm">KYC验证</div>
                        {verificationResult.modules.kyc && (
                          <CheckCircle2 className="w-4 h-4 mx-auto mt-2 text-green-500" />
                        )}
                      </CardContent>
                    </Card>

                    <Card className={verificationResult.modules.asset ? 'border-green-500' : 'opacity-50'}>
                      <CardContent className="pt-6 text-center">
                        <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${verificationResult.modules.asset ? 'text-green-500' : 'text-gray-400'}`} />
                        <div className="font-medium text-sm">资产验证</div>
                        {verificationResult.modules.asset && (
                          <CheckCircle2 className="w-4 h-4 mx-auto mt-2 text-green-500" />
                        )}
                      </CardContent>
                    </Card>

                    <Card className={verificationResult.modules.aml ? 'border-green-500' : 'opacity-50'}>
                      <CardContent className="pt-6 text-center">
                        <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${verificationResult.modules.aml ? 'text-green-500' : 'text-gray-400'}`} />
                        <div className="font-medium text-sm">AML验证</div>
                        {verificationResult.modules.aml && (
                          <CheckCircle2 className="w-4 h-4 mx-auto mt-2 text-green-500" />
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* 隐私保护说明 */}
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>隐私保护：</strong>
                    本验证过程使用零知识证明技术，仅验证用户是否满足要求，
                    不会泄露具体的年龄、资产金额或其他敏感信息。
                  </AlertDescription>
                </Alert>

                {/* 链上注册按钮 */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        完成链上注册
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        本地验证成功！现在可以将此证明注册到区块链，以便在 RWA 平台上使用。
                      </p>
                      <Button
                        onClick={() => router.push('/rwa-platform/register')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        前往链上注册
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {verificationResult.error || '证明验证失败，请检查证明文件是否正确'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}



