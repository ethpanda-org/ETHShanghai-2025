'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { isAddress } from 'viem'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw } from 'lucide-react'
import { generateOrderId, VerificationMethod, VerificationMethodText } from '@/lib/contracts'
import { TokenBalance } from './TokenBalance'

// 表单验证schema
const formSchema = z.object({
  receiver: z.string()
    .min(1, '请输入收款方地址')
    .refine((val) => isAddress(val), '请输入有效的以太坊地址'),
  amount: z.string()
    .min(1, '请输入支付金额')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, '金额必须大于0'),
  currency: z.literal('USDT'),
  verificationMethod: z.nativeEnum(VerificationMethod),
  email: z.string().email('请输入有效的邮箱地址'),
  orderId: z.string().min(12, '订单号必须为12位'),
})

export type FormValues = z.infer<typeof formSchema>

interface CreateContractFormProps {
  onSubmit: (values: FormValues) => void
  isCreating: boolean
  orderId: string
  onOrderIdChange: (orderId: string) => void
  onAmountChange?: (amount: string) => void
}

export function CreateContractForm({ onSubmit, isCreating, orderId, onOrderIdChange, onAmountChange }: CreateContractFormProps) {
  const { address } = useAccount()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      receiver: '',
      amount: '',
      currency: 'USDT',
      verificationMethod: VerificationMethod.EMAIL,
      email: '',
      orderId: orderId,
    },
  })

  // 当 orderId prop 改变时，更新表单值
  React.useEffect(() => {
    form.setValue('orderId', orderId)
  }, [orderId, form])

  // 监听金额变化
  const amountValue = form.watch('amount')
  React.useEffect(() => {
    if (onAmountChange) {
      onAmountChange(amountValue)
    }
  }, [amountValue, onAmountChange])

  // 重新生成订单号
  const regenerateOrderId = () => {
    const newOrderId = generateOrderId()
    onOrderIdChange(newOrderId)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* 收款方地址 */}
        <FormField
          control={form.control}
          name="receiver"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">收款方钱包地址 *</FormLabel>
              <FormControl>
                <Input
                  placeholder="0x..."
                  {...field}
                  disabled={isCreating}
                  className="h-12 text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 支付币种和金额 - 同一行，各占一半 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 支付币种 */}
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">支付币种 *</FormLabel>
                <Select value={field.value} disabled>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USDT" className="text-base h-12 py-3">USDT (ERC20)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  MVP阶段仅支持USDT
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 支付金额 - 带余额显示 */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">支付金额 *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      disabled={isCreating}
                      className="h-12 text-base pr-16"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <span className="text-gray-500 text-base">USDT</span>
                    </div>
                  </div>
              </FormControl>
              {address && (
                <FormDescription className="text-right">
                  <TokenBalance address={address} inline />
                </FormDescription>
              )}
              <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 验证方式 */}
        <FormField
          control={form.control}
          name="verificationMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">验证方式 *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isCreating}
              >
                <FormControl>
                  <SelectTrigger className="h-12 text-base w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={VerificationMethod.EMAIL} className="text-base h-12 py-3">
                    {VerificationMethodText[VerificationMethod.EMAIL]}
                  </SelectItem>
                  <SelectItem value={VerificationMethod.ENTERPRISE_SIGN} disabled className="text-base h-12 py-3">
                    {VerificationMethodText[VerificationMethod.ENTERPRISE_SIGN]}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 邮箱地址 */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">您的邮箱地址 *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  {...field}
                  disabled={isCreating}
                  className="h-12 text-base"
                />
              </FormControl>
              <FormDescription>
                用于发送放款指令，请使用真实邮箱
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 订单号 */}
        <FormField
          control={form.control}
          name="orderId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">订单/合同编号</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    {...field}
                    readOnly
                    className="bg-gray-50 font-mono h-12 text-base"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={regenerateOrderId}
                  disabled={isCreating}
                  className="h-12 w-12"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
