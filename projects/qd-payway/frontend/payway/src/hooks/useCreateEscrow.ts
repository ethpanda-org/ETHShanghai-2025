'use client'

import { useState, useCallback } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { CONTRACTS, ESCROW_ABI } from '@/lib/contracts'
import usdtAbi from '@/lib/usdt-abi.json'
import { TransactionStep } from '@/components/contract/TransactionProgress'
import { saveContract } from '@/lib/db'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CreateEscrowParams {
  orderId: string
  receiver: `0x${string}`
  amount: string
  email: string
}

export function useCreateEscrow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<TransactionStep>(TransactionStep.IDLE)
  const [error, setError] = useState<string>()
  const [transactionHash, setTransactionHash] = useState<string>()
  const [approveHash, setApproveHash] = useState<`0x${string}`>()
  const [depositHash, setDepositHash] = useState<`0x${string}`>()

  // Approve交易
  const { writeContractAsync: approveAsync } = useWriteContract()
  
  // Deposit交易
  const { writeContractAsync: depositAsync } = useWriteContract()

  // 等待Approve确认
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // 等待Deposit确认
  const { isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  // 创建托管合约
  const createEscrow = useCallback(async (params: CreateEscrowParams) => {
    const { orderId, receiver, amount, email } = params

    try {
      setError(undefined)
      setCurrentStep(TransactionStep.APPROVING)

      // 转换金额（USDT是6位小数）
      const amountInWei = parseUnits(amount, 6)

      // 步骤1: Approve USDT
      console.log('Step 1: Approving USDT...')
      const approveHash = await approveAsync({
        address: CONTRACTS.USDT_SEPOLIA as `0x${string}`,
        abi: usdtAbi,
        functionName: 'approve',
        args: [CONTRACTS.ESCROW as `0x${string}`, amountInWei],
      })

      setApproveHash(approveHash)
      setTransactionHash(approveHash)
      toast.success('授权交易已提交')

      // 等待Approve确认
      console.log('Waiting for approve confirmation...')
      setCurrentStep(TransactionStep.APPROVED)
      
      // 等待一小段时间确保交易确认
      await new Promise(resolve => setTimeout(resolve, 3000))

      // 步骤2: 创建托管（advancePay）
      console.log('Step 2: Creating escrow...')
      setCurrentStep(TransactionStep.DEPOSITING)

      const depositHash = await depositAsync({
        address: CONTRACTS.ESCROW as `0x${string}`,
        abi: ESCROW_ABI,
        functionName: 'advancePay',
        args: [
          BigInt(orderId), // _orderID
          receiver, // _receiver
          CONTRACTS.USDT_SEPOLIA as `0x${string}`, // _stableCoin
          amountInWei, // amount
        ],
      })

      setDepositHash(depositHash)
      setTransactionHash(depositHash)
      toast.success('托管合约创建交易已提交')

      // 等待Deposit确认
      console.log('Waiting for deposit confirmation...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      // 步骤3: 保存到数据库
      console.log('Saving to database...')
      await saveContract({
        orderId,
        senderAddress: receiver, // 这里应该是当前用户地址，需要从useAccount获取
        receiverAddress: receiver,
        amount,
        tokenAddress: CONTRACTS.USDT_SEPOLIA,
        status: 'PENDING',
        verificationMethod: 'email',
        verificationEmail: email,
        transactionHash: depositHash,
      })

      setCurrentStep(TransactionStep.COMPLETED)
      toast.success('🎉 托管合约创建成功！')

      // 跳转到详情页
      setTimeout(() => {
        router.push(`/dashboard/contracts/${orderId}`)
      }, 2000)

    } catch (err: any) {
      console.error('Error creating escrow:', err)
      setCurrentStep(TransactionStep.ERROR)
      
      // 处理用户拒绝
      if (err.message?.includes('User rejected')) {
        setError('您拒绝了交易')
        toast.error('交易已取消')
      } else if (err.message?.includes('insufficient funds')) {
        setError('余额不足，请确保有足够的USDT和ETH支付Gas费')
        toast.error('余额不足')
      } else {
        setError(err.message || '创建托管合约失败')
        toast.error('交易失败')
      }
    }
  }, [approveAsync, depositAsync, router])

  return {
    createEscrow,
    isCreating: currentStep !== TransactionStep.IDLE && currentStep !== TransactionStep.COMPLETED && currentStep !== TransactionStep.ERROR,
    isSuccess: currentStep === TransactionStep.COMPLETED,
    currentStep,
    error,
    transactionHash,
  }
}

