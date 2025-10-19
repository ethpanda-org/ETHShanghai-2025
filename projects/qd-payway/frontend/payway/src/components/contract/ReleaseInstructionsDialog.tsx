'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check, Mail, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ReleaseInstructionsDialogProps {
  orderId: string
  userEmail: string
  children?: React.ReactNode
}

export function ReleaseInstructionsDialog({
  orderId,
  userEmail,
  children,
}: ReleaseInstructionsDialogProps) {
  const [copiedSubject, setCopiedSubject] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  // 放款指令邮箱
  const releaseEmail = process.env.NEXT_PUBLIC_RELEASE_EMAIL_ADDRESS || 'release@payway.example.com'
  
  // 邮件主题
  const emailSubject = `RELEASE: ${orderId}`

  const copyToClipboard = async (text: string, type: 'subject' | 'email') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'subject') {
        setCopiedSubject(true)
        setTimeout(() => setCopiedSubject(false), 2000)
      } else {
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      }
      toast.success('已复制到剪贴板')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '复制失败，请手动复制')
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2 h-12">
            <Mail className="h-4 w-4" />
            申请放款
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">📧 如何申请放款？</DialogTitle>
          <DialogDescription>
            通过发送邮件指令，我们将为您自动完成链上放款操作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 步骤说明 */}
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-blue-900">请按照以下步骤操作：</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>使用您预留的邮箱 <span className="font-mono font-semibold">{userEmail}</span></li>
                  <li>发送邮件到下方指定的放款指令邮箱</li>
                  <li>邮件主题必须为下方显示的格式</li>
                  <li>邮件正文可以留空或写任何内容</li>
                </ol>
              </div>
            </div>
          </div>

          {/* 收件人邮箱 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              1. 收件人（放款指令邮箱）
            </label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-md bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-sm">
                {releaseEmail}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(releaseEmail, 'email')}
                className="flex-shrink-0"
              >
                {copiedEmail ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 邮件主题 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              2. 邮件主题（必须完全一致）
            </label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-md bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-sm">
                {emailSubject}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(emailSubject, 'subject')}
                className="flex-shrink-0"
              >
                {copiedSubject ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              ⚠️ 主题格式必须严格为：<span className="font-mono">RELEASE: [订单号]</span>
            </p>
          </div>

          {/* 处理时间说明 */}
          <div className="rounded-lg bg-green-50 p-4 border border-green-200">
            <p className="text-sm text-green-800">
              <span className="font-semibold">⏱️ 处理时间：</span>
              我们通常会在收到邮件后的 <span className="font-semibold">5-10 分钟</span> 内完成验证并执行链上放款。
              请耐心等待，页面状态会自动更新。
            </p>
          </div>

          {/* 安全提示 */}
          <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">🔐 安全提示：</span>
              只有从您预留的邮箱 <span className="font-mono font-semibold">{userEmail}</span> 发送的指令才会被接受。
              从其他邮箱发送将被自动拒绝。
            </p>
          </div>

          {/* 快捷操作按钮 */}
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 h-12"
              onClick={() => {
                const mailtoLink = `mailto:${releaseEmail}?subject=${encodeURIComponent(emailSubject)}`
                window.location.href = mailtoLink
                toast.success('已打开邮件客户端')
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              打开邮件客户端
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

