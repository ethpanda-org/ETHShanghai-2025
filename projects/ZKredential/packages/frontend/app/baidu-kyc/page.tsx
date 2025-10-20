'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  FileText,
  User,
  Video
} from 'lucide-react'

enum KYCStep {
  ID_CARD_FRONT = 1,
  ID_CARD_BACK = 2,
  SELFIE = 3,
  LIVENESS = 4,
  PROCESSING = 5,
  COMPLETE = 6
}

interface UploadedImages {
  idCardFront: string | null
  idCardBack: string | null
  selfie: string | null
  livenessVideo: string | null
}

export default function BaiduKYCPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address } = useAccount()
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [currentStep, setCurrentStep] = useState<KYCStep>(KYCStep.ID_CARD_FRONT)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<UploadedImages>({
    idCardFront: null,
    idCardBack: null,
    selfie: null,
    livenessVideo: null
  })
  const [processingTime, setProcessingTime] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let id = searchParams.get('session')
    if (!id) {
      // 如果没有session参数，生成一个新的
      id = `baidu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('🔧 前端自动生成sessionId:', id)
    }
    setSessionId(id)
  }, [searchParams])

  // 处理图片上传
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: keyof UploadedImages) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)

    try {
      // 转换为Base64
      const base64 = await fileToBase64(file)
      
      setImages(prev => ({ ...prev, [type]: base64 }))
      
      // 自动进入下一步
      if (type === 'idCardFront') {
        setCurrentStep(KYCStep.ID_CARD_BACK)
      } else if (type === 'idCardBack') {
        setCurrentStep(KYCStep.SELFIE)
      } else if (type === 'selfie') {
        setCurrentStep(KYCStep.LIVENESS)
      }
    } catch (error) {
      setError('图片处理失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  // 开启摄像头进行自拍
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (error) {
      setError('无法访问摄像头，请检查权限设置')
    }
  }

  // 拍照
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    const base64 = canvas.toDataURL('image/jpeg')
    setImages(prev => ({ ...prev, selfie: base64 }))

    // 停止摄像头
    const stream = video.srcObject as MediaStream
    stream?.getTracks().forEach(track => track.stop())

    setCurrentStep(KYCStep.LIVENESS)
  }

  // 跳过活体检测
  const skipLiveness = () => {
    setCurrentStep(KYCStep.PROCESSING)
    submitKYC()
  }

  // 提交KYC验证
  const submitKYC = async () => {
    setCurrentStep(KYCStep.PROCESSING)
    setIsProcessing(true)
    setError(null)
    setProcessingTime(0)

    // 启动计时器
    const timer = setInterval(() => {
      setProcessingTime(prev => prev + 1)
    }, 1000)

    // 60秒后自动跳过
    const autoSkipTimer = setTimeout(() => {
      clearInterval(timer)
      setError('验证超时，已自动跳过。点击下方按钮继续流程。')
      setIsProcessing(false)
    }, 60000)

    try {
      console.log('开始提交百度AI KYC验证...')
      
      const response = await fetch('/api/kyc/baidu/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          idCardFront: images.idCardFront,
          idCardBack: images.idCardBack,
          selfie: images.selfie,
          livenessVideo: images.livenessVideo
        })
      })

      const data = await response.json()

      console.log('百度AI验证结果:', data)

      // 清除计时器
      clearInterval(timer)
      clearTimeout(autoSkipTimer)

      if (data.success) {
        setCurrentStep(KYCStep.COMPLETE)
        
        // 保存验证结果到localStorage
        if (typeof window !== 'undefined' && address) {
          localStorage.setItem('kyc_verified', 'true')
          localStorage.setItem('kyc_session', sessionId || '')
          localStorage.setItem('kyc_user_data', JSON.stringify(data.result?.userData || {}))
          
          // 创建并保存VC到VCStorage
          const { VCStorageService } = await import('@/lib/services/vc-storage-service')
          const vcStorage = new VCStorageService()
          
          const vc = await vcStorage.createVCFromBaiduKYC(
            data.result || {},
            address
          )
          
          vcStorage.storeVC(address, vc)
          console.log('✅ VC已创建并保存', { vcId: vc.id, address: address })
        }
        
        // 2秒后重定向回证明生成页面
        setTimeout(() => {
          router.push(`/proof-generation?provider=baidu&session_id=${sessionId}&status=success`)
        }, 2000)
      } else {
        // 显示真实的错误信息
        const errorCode = data.code
        const errorMsg = data.details || data.error || '验证失败'
        const suggestion = data.suggestion || '请重试'
        
        throw new Error(`${errorMsg}\n${suggestion}`)
      }
    } catch (error) {
      console.error('KYC验证失败:', error)
      clearInterval(timer)
      clearTimeout(autoSkipTimer)
      setError(error instanceof Error ? error.message : 'KYC验证失败，请检查图片质量或重试')
      setIsProcessing(false)
      // 不返回到自拍步骤，停留在当前步骤显示错误和跳过按钮
    }
  }

  const progress = ((currentStep - 1) / (Object.keys(KYCStep).length / 2 - 1)) * 100

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-center">百度智能云身份认证</CardTitle>
          <CardDescription className="text-center">
            个人可用，完全免费 - 请按提示完成身份验证流程
          </CardDescription>
        </CardHeader>
        
        {/* 📱 设备建议提示 */}
        <div className="mx-6 mb-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Camera className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-medium mb-1">💡 获得更好的验证效果：</div>
              <div className="text-sm space-y-1">
                <div>• 📱 <strong>推荐使用手机</strong>进行人脸识别，摄像头质量更好</div>
                <div>• 💡 确保光线充足，避免逆光或阴影</div>
                <div>• 📏 保持适当距离，人脸占画面1/3左右</div>
                <div>• 🎯 电脑摄像头可能影响识别准确率</div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <CardContent>
          <Progress value={progress} className="mb-4" />
          <p className="text-center text-sm text-muted-foreground">
            步骤 {currentStep} / 6
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          {currentStep === KYCStep.ID_CARD_FRONT && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <FileText className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">上传身份证正面</h3>
                <p className="text-sm text-muted-foreground">
                  请确保照片清晰，四角完整，无反光
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'idCardFront')}
                className="hidden"
                aria-label="上传身份证正面"
              />

              {images.idCardFront ? (
                <div className="space-y-4">
                  <img src={images.idCardFront} alt="身份证正面" className="w-full rounded-lg border" />
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
                    重新上传
                  </Button>
                  <Button onClick={() => setCurrentStep(KYCStep.ID_CARD_BACK)} className="w-full">
                    下一步
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  <Upload className="mr-2 w-4 h-4" />
                  {isProcessing ? '处理中...' : '上传身份证正面'}
                </Button>
              )}
            </div>
          )}

          {currentStep === KYCStep.ID_CARD_BACK && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <FileText className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">上传身份证反面</h3>
                <p className="text-sm text-muted-foreground">
                  请上传身份证国徽面
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'idCardBack')}
                className="hidden"
                id="idCardBack"
                aria-label="上传身份证反面"
              />

              {images.idCardBack ? (
                <div className="space-y-4">
                  <img src={images.idCardBack} alt="身份证反面" className="w-full rounded-lg border" />
                  <Button onClick={() => document.getElementById('idCardBack')?.click()} variant="outline" className="w-full">
                    重新上传
                  </Button>
                  <Button onClick={() => setCurrentStep(KYCStep.SELFIE)} className="w-full">
                    下一步
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => document.getElementById('idCardBack')?.click()}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  <Upload className="mr-2 w-4 h-4" />
                  {isProcessing ? '处理中...' : '上传身份证反面'}
                </Button>
              )}
            </div>
          )}

          {currentStep === KYCStep.SELFIE && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <User className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">人脸识别</h3>
                <p className="text-sm text-muted-foreground">
                  请正对摄像头，确保面部清晰可见
                </p>
              </div>

              {!images.selfie && (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button onClick={startCamera} variant="outline" className="flex-1">
                      <Camera className="mr-2 w-4 h-4" />
                      开启摄像头
                    </Button>
                    <Button onClick={capturePhoto} className="flex-1">
                      拍照
                    </Button>
                  </div>
                </div>
              )}

              {images.selfie && (
                <div className="space-y-4">
                  <img src={images.selfie} alt="自拍照" className="w-full rounded-lg border" />
                  <Button onClick={() => setImages(prev => ({ ...prev, selfie: null }))} variant="outline" className="w-full">
                    重新拍照
                  </Button>
                  <div className="flex gap-4">
                    <Button onClick={() => setCurrentStep(KYCStep.LIVENESS)} variant="outline" className="flex-1">
                      添加活体检测
                    </Button>
                    <Button onClick={skipLiveness} className="flex-1">
                      直接验证
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === KYCStep.LIVENESS && (
            <div className="space-y-4 text-center">
              <Video className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">活体检测（可选）</h3>
              <p className="text-sm text-muted-foreground mb-6">
                活体检测可以提高安全性，防止照片欺诈
              </p>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  活体检测需要录制短视频，如果当前环境不便，可以跳过此步骤
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button onClick={skipLiveness} variant="outline" className="flex-1">
                  跳过活体检测
                </Button>
                <Button onClick={() => setCurrentStep(KYCStep.PROCESSING)} className="flex-1">
                  开始活体检测
                </Button>
              </div>
            </div>
          )}

          {currentStep === KYCStep.PROCESSING && (
            <div className="space-y-4 text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">验证处理中...</h3>
              <p className="text-sm text-muted-foreground">
                正在调用百度AI API进行身份验证，预计需要5-10秒...
              </p>
              <p className="text-sm font-mono text-blue-600">
                已等待: {processingTime} 秒
              </p>
              
              <div className="space-y-2 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>身份证OCR识别</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>人脸检测</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>实名核验中...</span>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
                </Alert>
              )}

              {error && (
                <div className="mt-6 pt-6 border-t space-y-3">
                  <p className="text-xs text-muted-foreground text-center">
                    {error.includes('qps request limit') 
                      ? '请求过于频繁，请等待1秒后重试'
                      : '验证失败，请检查照片质量或重试'}
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="default"
                      onClick={() => {
                        setError(null)
                        setIsProcessing(false)
                        setCurrentStep(KYCStep.ID_CARD_FRONT)
                      }}
                      className="flex-1"
                    >
                      重新开始
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setError(null)
                        submitKYC()
                      }}
                      className="flex-1"
                    >
                      重试验证
                    </Button>
                  </div>
                </div>
              )}

              {!error && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-muted-foreground mb-3">
                    如果等待时间过长，可能是网络问题
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === KYCStep.COMPLETE && (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">验证成功！</h3>
              <p className="text-sm text-muted-foreground mb-6">
                您的身份验证已完成，正在返回应用...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 辅助函数：将File转换为Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // 🔧 验证文件类型
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }

    // 🔧 验证文件大小 (限制为5MB)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('图片文件过大，请选择小于5MB的图片'))
      return
    }

    console.log('📷 开始处理图片:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileSizeMB: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    })

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      
      // 🔧 验证Base64格式
      if (!result.includes(',')) {
        reject(new Error('图片格式错误'))
        return
      }
      
      // 移除data:image/xxx;base64,前缀
      const base64 = result.split(',')[1]
      
      // 🔧 验证Base64长度
      if (base64.length < 100) {
        reject(new Error('图片数据异常，请重新选择'))
        return
      }
      
      console.log('✅ 图片转换成功:', {
        fileName: file.name,
        fileSize: file.size,
        base64Length: base64.length,
        base64Preview: base64.substring(0, 50) + '...'
      })
      
      resolve(base64)
    }
    reader.onerror = error => {
      console.error('❌ 图片读取失败:', error)
      reject(new Error('图片读取失败，请重新选择'))
    }
  })
}


