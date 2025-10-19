'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, PAYMENT_GATEWAY_ABI } from '@/lib/contracts';
import toast from 'react-hot-toast';
import { formatUnits } from 'viem';

interface OrderDetailsModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface OrderData {
  orderId: string;
  orderIdString: string;
  merchant: string;
  payer: string;
  orderAmount: bigint;
  paymentToken: string;
  settlementToken: string;
  paidAmount: bigint;
  receivedAmount: bigint;
  exchangeRate: bigint;
  platformFee: bigint;
  merchantFee: bigint;
  status: number;
  createdAt: bigint;
  paidAt: bigint;
  expiryTime: bigint;
  metadataURI: string;
  allowPartialPayment: boolean;
}

const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: '⏳ Pending', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  1: { label: '💰 Paid', color: 'text-blue-600', bg: 'bg-blue-100' },
  2: { label: '🔄 Processing', color: 'text-purple-600', bg: 'bg-purple-100' },
  3: { label: '✅ Completed', color: 'text-green-600', bg: 'bg-green-100' },
  4: { label: '❌ Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
  5: { label: '⌛ Expired', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const TOKEN_SYMBOLS: Record<string, string> = {
  [CONTRACTS.MOCK_USDC.toLowerCase()]: 'USDC',
  [CONTRACTS.MOCK_USDT.toLowerCase()]: 'USDT',
  [CONTRACTS.MOCK_DAI.toLowerCase()]: 'DAI',
  [CONTRACTS.MOCK_WETH.toLowerCase()]: 'WETH',
  [CONTRACTS.MOCK_WBTC.toLowerCase()]: 'WBTC',
};

export default function OrderDetailsModal({ orderId, isOpen, onClose, onRefresh }: OrderDetailsModalProps) {
  const [orderDetails, setOrderDetails] = useState<OrderData | null>(null);

  // 使用getOrderDetailsByString获取完整订单信息
  const { data: fullOrder, isLoading: isOrderLoading, error } = useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'getOrderDetailsByString',
    args: [orderId],
    enabled: !!orderId && isOpen, // 只在有orderId且modal打开时查询
  });

  // 合约操作
  const { writeContract: cancelOrder, data: cancelHash } = useWriteContract();
  const { writeContract: refundOrder, data: refundHash } = useWriteContract();
  const { writeContract: settleOrder, data: settleHash } = useWriteContract();

  // 等待交易确认
  const { isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });
  const { isSuccess: isRefundSuccess } = useWaitForTransactionReceipt({ hash: refundHash });
  const { isSuccess: isSettleSuccess } = useWaitForTransactionReceipt({ hash: settleHash });

  useEffect(() => {
    console.log('OrderDetailsModal: orderId=', orderId, 'fullOrder=', fullOrder);
    if (fullOrder) {
      // getOrderDetailsByString 返回一个 tuple
      if (Array.isArray(fullOrder) && fullOrder.length >= 12) {
        const orderData: OrderData = {
          orderId: fullOrder[0],
          orderIdString: orderId, // 使用传入的orderId作为orderIdString
          merchant: fullOrder[1],
          payer: fullOrder[2],
          orderAmount: fullOrder[3],
          paymentToken: fullOrder[4],
          settlementToken: fullOrder[5],
          paidAmount: fullOrder[6],
          receivedAmount: fullOrder[7],
          status: Number(fullOrder[8]),
          createdAt: fullOrder[9],
          paidAt: fullOrder[6] > 0 ? fullOrder[9] : BigInt(0), // 如果有支付金额，使用创建时间作为支付时间的近似值
          expiryTime: fullOrder[10],
          metadataURI: fullOrder[11],
          allowPartialPayment: false, // 默认值，因为返回的数据中没有这个字段
          exchangeRate: BigInt(1e8), // 默认汇率 1:1
          platformFee: BigInt(0), // 默认值
          merchantFee: BigInt(0), // 默认值
        };
        console.log('Parsed orderData:', orderData);
        setOrderDetails(orderData);
      } else if (fullOrder && typeof fullOrder === 'object' && !Array.isArray(fullOrder)) {
        // 如果返回的是对象而不是数组
        console.log('Order data is object format');
        setOrderDetails({
          ...fullOrder,
          orderIdString: orderId,
          status: Number(fullOrder.status || 0)
        } as OrderData);
      }
    }
  }, [fullOrder, orderId]);

  useEffect(() => {
    if (error) {
      console.error('Error loading order details:', error);
    }
  }, [error]);

  useEffect(() => {
    if (isCancelSuccess) {
      toast.success('Order cancelled successfully!');
      onRefresh();
      onClose();
    }
  }, [isCancelSuccess, onRefresh, onClose]);

  useEffect(() => {
    if (isRefundSuccess) {
      toast.success('Order refunded successfully!');
      onRefresh();
      onClose();
    }
  }, [isRefundSuccess, onRefresh, onClose]);

  useEffect(() => {
    if (isSettleSuccess) {
      toast.success('Order settled successfully!');
      onRefresh();
      onClose();
    }
  }, [isSettleSuccess, onRefresh, onClose]);

  if (!isOpen) return null;

  // 显示加载状态或错误
  if (error || (isOrderLoading || !orderDetails)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="text-center">
            {error ? (
              <>
                <div className="text-red-500 text-center mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-semibold mb-2">Error Loading Order</p>
                <p className="text-gray-600 text-sm mb-4">Unable to fetch order details. Please try again.</p>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading order details...</p>
              </>
            )}
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm"
            >
              {error ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this order?')) {
      cancelOrder({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'cancelOrder',
        args: [orderDetails?.orderId as `0x${string}`],
      });
    }
  };

  const handleRefund = () => {
    if (confirm('Are you sure you want to refund this order?')) {
      refundOrder({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'refundOrder',
        args: [orderDetails?.orderId as `0x${string}`],
      });
    }
  };

  const handleSettle = () => {
    if (confirm('Are you sure you want to settle this order?')) {
      settleOrder({
        address: CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`,
        abi: PAYMENT_GATEWAY_ABI,
        functionName: 'settleOrder',
        args: [orderDetails?.orderId as `0x${string}`],
      });
    }
  };

  const orderAmount = Number(orderDetails.orderAmount || 0) / 1e6;
  const paidAmount = Number(orderDetails.paidAmount || 0) / 1e6;
  const receivedAmount = Number(orderDetails.receivedAmount || 0) / 1e6;
  const platformFee = orderAmount * 0.006; // 0.6% 平台费
  const merchantFee = 0; // 商户费默认为0
  const exchangeRate = Number(orderDetails.exchangeRate || 1e8) / 1e8;

  // 确保status是数字类型，并在有效范围内
  const orderStatus = orderDetails.status !== undefined ? Number(orderDetails.status) : 0;
  const validStatus = (orderStatus >= 0 && orderStatus <= 5) ? orderStatus : 0;
  const statusInfo = STATUS_CONFIG[validStatus] || { label: '⏳ Pending', color: 'text-yellow-600', bg: 'bg-yellow-100' };

  // 计算部分支付进度
  const paymentProgress = orderAmount > 0 ? (paidAmount / orderAmount) * 100 : 0;
  const isPartiallyPaid = paidAmount > 0 && paidAmount < orderAmount;
  const isExpired = Date.now() / 1000 > Number(orderDetails.expiryTime || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
            <p className="text-sm text-gray-600 mt-1 font-mono">{orderDetails.orderIdString || orderId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${statusInfo?.bg || 'bg-gray-100'} ${statusInfo?.color || 'text-gray-800'}`}>
              {statusInfo?.label || 'Unknown'}
              {isExpired && validStatus === 0 && ' (Expired)'}
            </span>
            <div className="text-sm text-gray-600">
              Created: {orderDetails.createdAt ? new Date(Number(orderDetails.createdAt) * 1000).toLocaleString() : 'N/A'}
            </div>
          </div>

          {/* Payment Progress - Only show if partial payment is allowed */}
          {orderDetails.allowPartialPayment && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Payment Progress</h3>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-blue-700 mb-1">
                  <span>Paid: ${paidAmount.toFixed(2)}</span>
                  <span>Total: ${orderAmount.toFixed(2)}</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-blue-600 font-medium">
                  {paymentProgress.toFixed(1)}% Complete
                  {isPartiallyPaid && ` - $${(orderAmount - paidAmount).toFixed(2)} remaining`}
                </div>
              </div>
              {isPartiallyPaid && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    ⚠️ This order has been partially paid. Customer can complete the remaining payment.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Order Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Order Amount</p>
                <p className="text-lg font-semibold text-gray-900">${orderAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Payment Token</p>
                <p className="text-lg font-semibold text-gray-900">
                  {orderDetails.paymentToken ? (TOKEN_SYMBOLS[orderDetails.paymentToken.toLowerCase()] || 'Unknown') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Settlement Token</p>
                <p className="text-lg font-semibold text-gray-900">
                  {orderDetails.settlementToken ? (TOKEN_SYMBOLS[orderDetails.settlementToken.toLowerCase()] || 'Unknown') : 'N/A'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {paidAmount > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Paid Amount</p>
                  <p className="text-lg font-semibold text-green-600">${paidAmount.toFixed(2)}</p>
                </div>
              )}
              {receivedAmount > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Received Amount</p>
                  <p className="text-lg font-semibold text-gray-900">${receivedAmount.toFixed(2)}</p>
                </div>
              )}
              {exchangeRate > 0 && exchangeRate !== 1 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Exchange Rate</p>
                  <p className="text-lg font-semibold text-gray-900">{exchangeRate.toFixed(4)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fees - Only show if order has been paid */}
          {paidAmount > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Fee Breakdown</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform Fee (0.6%):</span>
                <span className="font-medium">${platformFee.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Public Goods Donation (5% of fee):</span>
                <span className="font-medium">${(platformFee * 0.05).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
                <span>Merchant Receives:</span>
                <span>${(paidAmount - platformFee).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payer Information */}
          {orderDetails.payer && orderDetails.payer !== '0x0000000000000000000000000000000000000000' && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payer Address</p>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded-lg break-all">
                {orderDetails.payer}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Created At:</p>
              <p className="font-medium">
                {orderDetails.createdAt ? new Date(Number(orderDetails.createdAt) * 1000).toLocaleString() : 'N/A'}
              </p>
            </div>
            {orderDetails.paidAt && Number(orderDetails.paidAt) > 0 && (
              <div>
                <p className="text-gray-500">Paid At:</p>
                <p className="font-medium">{new Date(Number(orderDetails.paidAt) * 1000).toLocaleString()}</p>
              </div>
            )}
            {orderDetails.expiryTime && (
              <div>
                <p className="text-gray-500">Expires At:</p>
                <p className="font-medium">{new Date(Number(orderDetails.expiryTime) * 1000).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {/* View Payment Page */}
            <a
              href={`/pay/${orderDetails.orderIdString || orderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              View Payment Page
            </a>

            {/* Cancel Button - Only for pending orders */}
            {validStatus === 0 && !isExpired && (
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel Order
              </button>
            )}

            {/* Refund Button - Only for paid/processing orders */}
            {(validStatus === 1 || validStatus === 2) && (
              <button
                onClick={handleRefund}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Refund Order
              </button>
            )}

            {/* Settle Button - Only for paid orders */}
            {validStatus === 1 && (
              <button
                onClick={handleSettle}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Settle Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}