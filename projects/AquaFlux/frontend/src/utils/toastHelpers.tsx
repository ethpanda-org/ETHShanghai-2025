import { toast } from 'react-toastify';
import { getNetworkName, getExplorerUrl } from './networkHelpers';
import React from 'react';

/**
 * Show a transaction success toast with explorer link
 * @param txHash - Transaction hash
 * @param chainId - Chain ID
 * @param message - Custom success message (default: "交易成功!")
 * @param autoClose - Auto close time in ms (default: 10000)
 */
export const showTransactionSuccessToast = (
  txHash: string,
  chainId: number,
  message: string = "Transaction successful!",
  autoClose: number = 10000
): void => {
  toast.success(
    <div>
      <div>{message}</div>
      <a
        href={`${getExplorerUrl(chainId)}${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline text-blue-600"
      >
        View on {getNetworkName(chainId)}
      </a>
    </div>,
    {
      autoClose
    }
  );
};

/**
 * Show a transaction submitted toast
 * @param message - Custom message (default: "Transaction submitted, awaiting confirmation...")
 * @param autoClose - Auto close time in ms (default: 5000)
 */
export const showTransactionSubmittedToast = (
  message: string = "Transaction submitted, awaiting confirmation...",
  autoClose: number = 5000
): void => {
  toast.info(message, { autoClose });
};

/**
 * Show a transaction error toast
 * @param error - Error object
 * @param action - Action that failed (e.g., "Swap", "Approval")
 */
export const showTransactionErrorToast = (error: any, action: string = "Transaction"): void => {
  console.error(`${action} failed:`, error);

  if (error?.code === 4001 || error?.message?.includes('rejected') || error?.message?.includes('用户取消')) {
    toast.error(`${action} canceled by user`);
  } else if (error?.message?.includes('insufficient funds') || error?.message?.includes('余额不足')) {
    toast.error(`${action} failed: Insufficient funds`);
  } else if (error?.message?.includes('gas') || error?.message?.includes('Gas')) {
    toast.error(`${action} failed: Insufficient gas`);
  } else if (error?.message?.includes('slippage') || error?.message?.includes('滑点')) {
    toast.error(`${action} failed: Slippage too high, please increase slippage tolerance`);
  } else if (error?.message?.includes('deadline') || error?.message?.includes('过期')) {
    toast.error(`${action} failed: Transaction deadline exceeded`);
  } else {
    toast.error(`${action} failed: ${error?.message || 'Unknown error'}`);
  }
};

/**
 * Show a swap quote error toast
 * @param error - Error object
 */
export const showQuoteErrorToast = (error: any): void => {
  console.error('获取报价失败:', error);

  if (error?.message?.includes('revert') || error?.message?.includes('reverted')) {
    toast.error('获取报价失败: 流动性池不存在或代币对无法交易');
  } else if (error?.message?.includes('network') || error?.message?.includes('网络')) {
    toast.error('获取报价失败: 网络连接问题，请稍后重试');
  } else if (error?.message?.includes('rate limit') || error?.message?.includes('限制')) {
    toast.error('获取报价失败: 请求过于频繁，请稍后重试');
  } else {
    toast.error('获取报价失败，请检查代币配置或稍后重试');
  }
};

/**
 * Show approval success toast
 * @param tokenSymbol - Token symbol
 */
export const showApprovalSuccessToast = (tokenSymbol: string): void => {
  toast.success(`${tokenSymbol} approved successfully! You can now trade.`);
};

/**
 * Show approval submitted toast
 * @param tokenSymbol - Token symbol
 */
export const showApprovalSubmittedToast = (tokenSymbol: string): void => {
  toast.info(`${tokenSymbol} approval submitted, awaiting confirmation...`);
};

/**
 * Show swap success toast
 * @param fromAmount - From amount
 * @param fromSymbol - From token symbol
 * @param toAmount - To amount
 * @param toSymbol - To token symbol
 * @param txHash - Transaction hash
 * @param chainId - Chain ID
 */
export const showSwapSuccessToast = (
  fromAmount: string,
  fromSymbol: string,
  toAmount: string,
  toSymbol: string,
  txHash: string,
  chainId: number
): void => {
  const message = `Successfully swapped ${fromAmount} ${fromSymbol} → ${toAmount} ${toSymbol}`;
  showTransactionSuccessToast(txHash, chainId, message);
};

/**
 * Show swap submitted toast
 * @param fromAmount - From amount
 * @param fromSymbol - From token symbol
 * @param toSymbol - To token symbol
 */
export const showSwapSubmittedToast = (
  fromAmount: string,
  fromSymbol: string,
  toSymbol: string
): void => {
  const message = `Swap ${fromAmount} ${fromSymbol} → ${toSymbol} submitted, awaiting confirmation...`;
  showTransactionSubmittedToast(message);
};

/**
 * Show a generic success toast
 * @param message - Success message
 * @param autoClose - Auto close time in ms (default: 5000)
 */
export const showSuccessToast = (message: string, autoClose: number = 5000): void => {
  toast.success(message, { autoClose });
};

/**
 * Show a generic error toast
 * @param message - Error message
 * @param autoClose - Auto close time in ms (default: 5000)
 */
export const showErrorToast = (message: string, autoClose: number = 5000): void => {
  toast.error(message, { autoClose });
};

/**
 * Show a generic info toast
 * @param message - Info message
 * @param autoClose - Auto close time in ms (default: 5000)
 */
export const showInfoToast = (message: string, autoClose: number = 5000): void => {
  toast.info(message, { autoClose });
};