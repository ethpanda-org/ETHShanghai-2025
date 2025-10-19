'use client';

import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS, ERC20_ABI } from '@/lib/contracts';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function DebugAllowancePage() {
  const { address, isConnected } = useAccount();

  // 读取 USDC 授权给 PaymentGatewayV2 的额度
  const { data: allowanceV2 } = useReadContract({
    address: CONTRACTS.MOCK_USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, CONTRACTS.PAYMENT_GATEWAY_V2 as `0x${string}`],
  });

  // 读取 USDC 授权给旧版 PaymentGateway 的额度
  const { data: allowanceV1 } = useReadContract({
    address: CONTRACTS.MOCK_USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, CONTRACTS.PAYMENT_GATEWAY as `0x${string}`],
  });

  // 读取 USDC 余额
  const { data: balance } = useReadContract({
    address: CONTRACTS.MOCK_USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 授权额度诊断工具</h1>

        {!isConnected ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="mb-4">请先连接钱包</p>
            <ConnectButton />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 钱包信息 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">💼 钱包信息</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">地址:</span>
                  <span className="font-mono text-sm">{address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">USDC 余额:</span>
                  <span className="font-bold">{balance ? (Number(balance) / 1e6).toFixed(6) : '0'} USDC</span>
                </div>
              </div>
            </div>

            {/* 合约地址 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">📋 合约地址</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-gray-600">MOCK_USDC:</div>
                  <div className="font-mono bg-gray-100 p-2 rounded">{CONTRACTS.MOCK_USDC}</div>
                </div>
                <div>
                  <div className="text-gray-600">PaymentGatewayV2 (最新):</div>
                  <div className="font-mono bg-green-100 p-2 rounded">{CONTRACTS.PAYMENT_GATEWAY_V2}</div>
                </div>
                <div>
                  <div className="text-gray-600">PaymentGateway (旧版):</div>
                  <div className="font-mono bg-red-100 p-2 rounded">{CONTRACTS.PAYMENT_GATEWAY}</div>
                </div>
              </div>
            </div>

            {/* 授权额度 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">🔓 授权额度</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="text-gray-600 mb-1">授权给 PaymentGatewayV2 (最新):</div>
                  <div className="text-2xl font-bold text-green-600">
                    {allowanceV2 ? (Number(allowanceV2) / 1e6).toFixed(6) : '0'} USDC
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-1">
                    Raw: {allowanceV2?.toString() || '0'}
                  </div>
                  {allowanceV2 && Number(allowanceV2) > 0 ? (
                    <div className="mt-2 text-sm text-green-600">✅ 已授权</div>
                  ) : (
                    <div className="mt-2 text-sm text-red-600">❌ 未授权</div>
                  )}
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <div className="text-gray-600 mb-1">授权给 PaymentGateway (旧版):</div>
                  <div className="text-2xl font-bold text-red-600">
                    {allowanceV1 ? (Number(allowanceV1) / 1e6).toFixed(6) : '0'} USDC
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-1">
                    Raw: {allowanceV1?.toString() || '0'}
                  </div>
                  {allowanceV1 && Number(allowanceV1) > 0 && (
                    <div className="mt-2 text-sm text-orange-600">
                      ⚠️ 你可能授权给了旧版合约！请重新授权给 V2
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 诊断结果 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-xl font-bold mb-4">🔬 诊断结果</h2>
              <div className="space-y-2">
                {allowanceV2 && Number(allowanceV2) > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <span>授权正常！你已经授权给 PaymentGatewayV2</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">❌</span>
                    <span>未授权！请在支付页面点击 "Approve" 按钮</span>
                  </div>
                )}

                {allowanceV1 && Number(allowanceV1) > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    <span>检测到旧版授权！这可能是问题的原因</span>
                  </div>
                )}

                {balance && Number(balance) === 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <span>USDC 余额为 0！请先获取测试代币</span>
                  </div>
                )}
              </div>
            </div>

            {/* 操作建议 */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-800">💡 操作建议</h2>
              <ol className="list-decimal list-inside space-y-2 text-yellow-900">
                <li>确保你的 USDC 余额充足</li>
                <li>在支付页面点击 "Approve" 按钮</li>
                <li>等待授权交易确认（可能需要几秒钟）</li>
                <li>刷新此页面，确认授权额度已更新</li>
                <li>返回支付页面，点击 "Pay Now"</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

