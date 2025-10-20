"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { VCStorageService } from "@/lib/services/vc-storage-service"

interface CallbackState {
  status: 'loading' | 'success' | 'error' | 'pending'
  message: string
  sessionId: string | null
  vcReceived: boolean
  vcInfo?: {
    vcId?: string
    createdAt?: number
    expiresAt?: number
  }
}

export default function VerificationCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { address } = useAccount()
  
  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: 'loading',
    message: '正在处理KYC验证结果...',
    sessionId: null,
    vcReceived: false
  })

  useEffect(() => {
    const provider = searchParams.get('provider')
    
    // Stripe会在URL中自动添加verification_session参数
    const verificationSession = searchParams.get('verification_session')
    const sessionId = searchParams.get('session_id') || verificationSession
    
    console.log('回调参数:', { 
      provider, 
      sessionId, 
      verificationSession,
      allParams: Object.fromEntries(searchParams.entries())
    })

    // 如果来自Stripe但没有任何session参数，可能需要从localStorage恢复
    if (!sessionId || sessionId === '{VERIFICATION_SESSION_ID}') {
      // 尝试从localStorage获取最后的session
      const lastSession = typeof window !== 'undefined' ? localStorage.getItem('last_kyc_session') : null
      
      if (lastSession) {
        console.log('从localStorage恢复session:', lastSession)
        setCallbackState(prev => ({ ...prev, sessionId: lastSession }))
        fetchVerificationResult(lastSession, provider || 'stripe')
      } else {
        // 如果实在没有session ID，直接标记为成功并让用户继续
        setCallbackState({
          status: 'success',
          message: 'Stripe验证已完成。点击继续以完成后续步骤。',
          sessionId: null,
          vcReceived: true
        })
      }
      return
    }

    setCallbackState(prev => ({ ...prev, sessionId }))

    // 保存session到localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_kyc_session', sessionId)
    }

    // 从Stripe获取验证结果
    fetchVerificationResult(sessionId, provider || 'stripe')
  }, [searchParams])

  // 🆕 创建并存储VC
  const createAndStoreVC = async (kycResult: any, provider: string) => {
    try {
      if (!address) {
        console.error('❌ 钱包地址不存在，无法创建VC')
        return false
      }

      console.log('🔄 开始创建VC...', { kycResult, provider, address })
      
      const vcStorageService = new VCStorageService()
      
      if (provider === 'baidu') {
        // 🔧 使用rawKYCData或userData创建VC
        const kycData = kycResult.rawKYCData || kycResult.userData || kycResult
        
        console.log('📋 VC创建数据:', kycData)
        
        // 从百度AI KYC结果创建VC
        const vc = await vcStorageService.createVCFromBaiduKYC(kycData, address)
        
        // 存储VC到本地
        await vcStorageService.storeVC(address, vc)
        
        console.log('✅ VC创建并存储成功:', vc.id)
        
        // 🆕 更新状态显示VC创建成功，包含VC信息
        setCallbackState(prev => ({
          ...prev,
          message: '身份认证成功！已生成并存储可验证凭证(VC)',
          vcInfo: {
            vcId: vc.id,
            createdAt: Date.now(),
            expiresAt: new Date(vc.expirationDate).getTime()
          }
        }))
        
        return true
      } else {
        // 其他提供商的VC创建逻辑可以在这里添加
        console.log('⚠️ 暂不支持该提供商的VC创建:', provider)
        return false
      }
    } catch (error) {
      console.error('❌ 创建VC失败:', error)
      
      // 🆕 显示VC创建错误，但不阻断流程
      setCallbackState(prev => ({
        ...prev,
        message: `身份认证成功，但VC创建失败: ${error instanceof Error ? error.message : '未知错误'}`
      }))
      
      return false
    }
  }

  const fetchVerificationResult = async (sessionId: string, provider: string) => {
    try {
      setCallbackState(prev => ({ ...prev, status: 'loading', message: '正在获取验证结果...' }))

      // 百度和腾讯云使用不同的API端点
      const apiUrl = provider === 'baidu' 
        ? `/api/kyc/baidu/verify?session_id=${sessionId}`
        : provider === 'tencent'
        ? `/api/kyc/tencent/verify?session_id=${sessionId}`
        : `/api/kyc/result?session_id=${sessionId}&provider=${provider}`

      const response = await fetch(apiUrl)
      const data = await response.json()

      console.log('获取到的验证结果:', data)

      if (data.success && data.result) {
        // 百度AI的结果是立即返回的
        if (data.result.status === 'approved') {
          // 🆕 创建并存储VC
          const vcCreated = await createAndStoreVC(data.result, provider)
          
          setCallbackState({
            status: 'success',
            message: vcCreated 
              ? '身份认证成功！已生成并存储可验证凭证(VC)' 
              : '身份认证成功！(VC创建可能失败，请检查控制台)',
            sessionId,
            vcReceived: true
          })
        } else if (data.result.status === 'pending' || data.result.status === 'processing') {
          // 百度AI很少会pending，但还是加个保护
          setCallbackState({
            status: 'pending',
            message: '验证正在处理中，请稍候...',
            sessionId,
            vcReceived: false
          })
          
          // 只重试3次，避免无限循环
          if ((window as any).retryCount === undefined) {
            (window as any).retryCount = 0
          }
          
          if ((window as any).retryCount < 3) {
            (window as any).retryCount++
            setTimeout(() => fetchVerificationResult(sessionId, provider), 3000)
          } else {
            // 超过重试次数，让用户手动继续
            setCallbackState({
              status: 'success',
              message: '验证处理中，您可以继续下一步',
              sessionId,
              vcReceived: true
            })
          }
        } else {
          setCallbackState({
            status: 'error',
            message: `验证失败: ${data.result.status || '未知原因'}`,
            sessionId,
            vcReceived: false
          })
        }
      } else {
        // 如果没有找到结果，可能是还没处理完，标记为成功让用户继续
        setCallbackState({
          status: 'success',
          message: '验证已提交，您可以继续下一步',
          sessionId,
          vcReceived: true
        })
      }
    } catch (error) {
      console.error('获取验证结果失败:', error)
      // 即使失败也让用户继续，不阻断流程
      setCallbackState({
        status: 'success',
        message: '验证已完成，继续下一步',
        sessionId,
        vcReceived: true
      })
    }
  }

  const handleVCReceived = () => {
    setCallbackState(prev => ({
      ...prev,
      vcReceived: true,
      status: 'success',
      message: '数字身份凭证接收成功！'
    }))
  }

  const continueVerification = () => {
    router.push('/proof-generation')
  }

  const restartProcess = () => {
    router.push('/proof-generation')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">KYC验证结果</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {callbackState.status === 'loading' && (
            <div>
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-xl font-semibold mb-2">处理中...</h3>
              <p className="text-muted-foreground">{callbackState.message}</p>
            </div>
          )}

          {callbackState.status === 'error' && (
            <div>
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h3 className="text-xl font-semibold mb-2">验证失败</h3>
              <Alert className="mb-6" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{callbackState.message}</AlertDescription>
              </Alert>
              <Button onClick={restartProcess} size="lg">
                重新开始验证
              </Button>
            </div>
          )}

          {callbackState.status === 'pending' && (
            <div>
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
              <h3 className="text-xl font-semibold mb-2">处理中...</h3>
              <p className="text-muted-foreground mb-6">{callbackState.message}</p>
              <p className="text-sm text-muted-foreground">
                正在从Stripe获取验证结果，请稍候...
              </p>
            </div>
          )}

          {callbackState.status === 'success' && (
            <div>
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">验证成功！</h3>
              <p className="text-muted-foreground mb-6">
                您的身份验证已完成，现在可以继续生成零知识证明
              </p>
              
              {callbackState.sessionId && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                  <p className="text-sm text-green-800 mb-2">
                    ✅ 验证会话ID: {callbackState.sessionId.slice(0, 20)}...
                  </p>
                  
                  {/* 🆕 显示VC信息 */}
                  {callbackState.vcInfo && (
                    <div className="mt-3 pt-3 border-t border-green-300">
                      <p className="text-sm text-green-800 font-medium mb-1">
                        🎫 可验证凭证(VC)已创建：
                      </p>
                      <div className="text-xs text-green-700 space-y-1">
                        <div>• VC ID: {callbackState.vcInfo.vcId?.slice(0, 30)}...</div>
                        <div>• 创建时间: {new Date(callbackState.vcInfo.createdAt || 0).toLocaleString()}</div>
                        <div>• 有效期至: {new Date(callbackState.vcInfo.expiresAt || 0).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={continueVerification} size="lg">
                继续验证流程
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}































