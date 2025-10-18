'use client'

import { useState } from 'react'
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
import { RefreshCw, Loader2 } from 'lucide-react'
import { generateOrderId, VerificationMethod, VerificationMethodText } from '@/lib/contracts'
import { TokenBalance } from './TokenBalance'
import { useCreateEscrow } from '@/hooks/useCreateEscrow'
import { TransactionProgress } from './TransactionProgress'

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

type FormValues = z.infer<typeof formSchema>

export function CreateContractForm() {
  const { address } = useAccount()
  const [orderId, setOrderId] = useState(generateOrderId())

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

  const {
    createEscrow,
    isCreating,
    currentStep,
    error,
    transactionHash,
    isSuccess,
  } = useCreateEscrow()

  // 重新生成订单号
  const regenerateOrderId = () => {
    const newOrderId = generateOrderId()
    setOrderId(newOrderId)
    form.setValue('orderId', newOrderId)
  }

  // 提交表单
  const onSubmit = async (values: FormValues) => {
    console.log('Form values:', values)
    await createEscrow({
      orderId: values.orderId,
      receiver: values.receiver as `0x${string}`,
      amount: values.amount,
      email: values.email,
    })
  }

  return (
    <div className="space-y-6">
      {/* 余额显示 */}
      {address && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <TokenBalance address={address} />
        </div>
      )}

      {/* 交易进度 */}
      {(isCreating || isSuccess) && (
        <TransactionProgress 
          step={currentStep}
          transactionHash={transactionHash}
          error={error}
        />
      )}

      {/* 表单 */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 收款方地址 */}
          <FormField
            control={form.control}
            name="receiver"
            render={({ field }) => (
              <FormItem>
                <FormLabel>收款方钱包地址 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0x..."
                    {...field}
                    disabled={isCreating}
                  />
                </FormControl>
                <FormDescription>
                  请输入收款方的以太坊钱包地址
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 支付币种 */}
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>支付币种 *</FormLabel>
                <Select value={field.value} disabled>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USDT">USDT (ERC20)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  MVP阶段仅支持USDT
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 支付金额 */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>支付金额 *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      disabled={isCreating}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">USDT</span>
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  请输入需要托管的USDT数量
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 验证方式 */}
          <FormField
            control={form.control}
            name="verificationMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>验证方式 *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isCreating}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={VerificationMethod.EMAIL}>
                      {VerificationMethodText[VerificationMethod.EMAIL]}
                    </SelectItem>
                    <SelectItem value={VerificationMethod.ENTERPRISE_SIGN} disabled>
                      {VerificationMethodText[VerificationMethod.ENTERPRISE_SIGN]}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  选择放款条件的验证方式
                </FormDescription>
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
                <FormLabel>您的邮箱地址 *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    {...field}
                    disabled={isCreating}
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
                <FormLabel>订单/合同编号</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      readOnly
                      className="bg-gray-50 font-mono"
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={regenerateOrderId}
                    disabled={isCreating}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <FormDescription>
                  系统自动生成，用于业务识别
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 提交按钮 */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isCreating || isSuccess}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? '创建中...' : '创建并支付'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

