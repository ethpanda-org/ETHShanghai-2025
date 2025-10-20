import { ethers } from 'https://esm.sh/ethers@6.9.0'

// 合约ABI - pay函数
const ESCROW_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_orderID",
        "type": "uint256"
      }
    ],
    "name": "pay",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

/**
 * 获取 Ethereum provider
 */
export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = Deno.env.get('ETH_RPC_URL') || 'https://ethereum-sepolia-rpc.publicnode.com'
  return new ethers.JsonRpcProvider(rpcUrl)
}

/**
 * 获取平台钱包
 */
export function getPlatformWallet(): ethers.Wallet {
  const privateKey = Deno.env.get('PLATFORM_WALLET_PRIVATE_KEY')
  
  if (!privateKey) {
    throw new Error('PLATFORM_WALLET_PRIVATE_KEY not configured')
  }

  const provider = getProvider()
  return new ethers.Wallet(privateKey, provider)
}

/**
 * 获取托管合约实例
 */
export function getEscrowContract(wallet: ethers.Wallet): ethers.Contract {
  const escrowAddress = Deno.env.get('ESCROW_CONTRACT_ADDRESS')
  
  if (!escrowAddress) {
    throw new Error('ESCROW_CONTRACT_ADDRESS not configured')
  }

  return new ethers.Contract(escrowAddress, ESCROW_ABI, wallet)
}

/**
 * 调用智能合约的 pay 函数释放资金
 */
export async function releasePayment(orderId: string): Promise<{ txHash: string; success: boolean }> {
  try {
    // 获取平台钱包
    const wallet = getPlatformWallet()
    
    // 检查钱包余额（确保有足够的 Gas）
    const balance = await wallet.provider.getBalance(wallet.address)
    const minBalance = ethers.parseEther('0.005') // 最低 0.005 ETH
    
    if (balance < minBalance) {
      throw new Error(`Insufficient gas: wallet balance is ${ethers.formatEther(balance)} ETH`)
    }

    // 获取合约实例
    const escrowContract = getEscrowContract(wallet)
    
    console.log(`Calling pay(${orderId}) from wallet ${wallet.address}`)
    
    // 调用 pay 函数
    const tx = await escrowContract.pay(BigInt(orderId), {
      gasLimit: 200000, // 设置合理的 gas limit
    })
    
    console.log(`Transaction submitted: ${tx.hash}`)
    
    // 等待交易确认（至少1个确认）
    const receipt = await tx.wait(1)
    
    if (!receipt || receipt.status === 0) {
      throw new Error('Transaction failed')
    }
    
    console.log(`Transaction confirmed: ${tx.hash}`)
    
    return {
      txHash: tx.hash,
      success: true,
    }
  } catch (error: any) {
    console.error('Error releasing payment:', error)
    
    // 提供更详细的错误信息
    let errorMessage = error.message || 'Unknown blockchain error'
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Platform wallet has insufficient ETH for gas'
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      errorMessage = 'Transaction would fail (possible contract revert)'
    } else if (error.code === 'CALL_EXCEPTION') {
      errorMessage = 'Contract call failed (check contract state and permissions)'
    }
    
    throw new Error(errorMessage)
  }
}

/**
 * 查询合约状态
 */
export async function getContractStatus(orderId: string): Promise<number> {
  try {
    const wallet = getPlatformWallet()
    const escrowContract = getEscrowContract(wallet)
    
    // 调用 getPayment 获取合约信息
    const payment = await escrowContract.getPayment(BigInt(orderId))
    
    // 返回状态：0-PENDING, 1-PAID, 2-CANCELLED
    return Number(payment._orderStatus)
  } catch (error) {
    console.error('Error getting contract status:', error)
    throw new Error('Failed to query contract status')
  }
}

