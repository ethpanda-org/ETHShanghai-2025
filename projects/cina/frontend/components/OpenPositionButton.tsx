'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { 
  getMeta, 
  ensureApprove, 
  openPositionFlashLoan, 
  openLeveragePosition,
  watchTx, 
  getPositions,
  getTokenBalance,
  type OpenPositionParams,
  type LeverageOpenPositionParams,
  type Position
} from '@/lib/position';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface OpenPositionButtonProps {
  onSuccess?: (positions: Position[]) => void;
  onError?: (error: string) => void;
}

export default function OpenPositionButton({ onSuccess, onError }: OpenPositionButtonProps) {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [collateralAmount, setCollateralAmount] = useState('1.0'); // 默认1个stETH
  const [leverage, setLeverage] = useState('1.0'); // 默认1倍杠杆
  const [status, setStatus] = useState<string>('');
  
  // 新增：一步到位杠杆开仓状态
  const [wrmbAmount, setWrmbAmount] = useState('1000.0'); // 默认1000 WRMB
  const [wbtcAmount, setWbtcAmount] = useState('0.1'); // 默认0.1 WBTC
  const [tradingMode, setTradingMode] = useState<'traditional' | 'leverage'>('leverage'); // 交易模式

  const handleOpenPosition = async () => {
    if (!isConnected || !address) {
      onError?.('请先连接钱包');
      return;
    }

    setIsLoading(true);
    setStatus('');

    try {
      const meta = getMeta();
      
      if (tradingMode === 'leverage') {
        // 一步到位杠杆开仓流程
        await handleLeveragePosition(meta, address);
      } else {
        // 传统开仓流程
        await handleTraditionalPosition(meta, address);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '开仓失败';
      setStatus(`错误: ${errorMessage}`);
      onError?.(errorMessage);
      console.error('开仓失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeveragePosition = async (meta: any, address: `0x${string}`) => {
    setStatus('开始一步到位杠杆开仓...');
    
    // 1. 检查WRMB余额
    console.log('72检查WRMB余额')
    setStatus('检查WRMB余额...');
    const wrmbBalance = await getTokenBalance(meta.tokens.WRMB, address);
    const wrmbAmountWei = parseEther(wrmbAmount);
    
    if (wrmbBalance < wrmbAmountWei) {
      throw new Error(`WRMB余额不足，当前余额: ${formatEther(wrmbBalance)}`);
    }

    console.log('81授权WRMB...')

    // 2. 授权WRMB
    setStatus('授权WRMB...');
    await ensureApprove(
      meta.tokens.WRMB,
      address,
      meta.diamond,
      wrmbAmountWei
    );

    // 3. 计算参数
    const leverageMultiplier = parseFloat(leverage);
    const wbtcAmountWei = parseEther(wbtcAmount);
    const minFxUSDMint = wbtcAmountWei * BigInt(Math.floor(leverageMultiplier * 10000)) / 10000n;
    const minWbtcOut = wbtcAmountWei * 95n / 100n; // 5%滑点保护

    // 4. 构造一步到位杠杆开仓参数
    const leverageParams: LeverageOpenPositionParams = {
      user: address,
      wrmbAmount: wrmbAmountWei,
      wbtcAmount: wbtcAmountWei,
      leverageMultiplier: leverageMultiplier,
      minFxUSDMint: minFxUSDMint,
      minWbtcOut: minWbtcOut,
      swapData: '0x' // 暂时不进行DEX交换
    };

    // 5. 发送交易
    setStatus('发送一步到位杠杆开仓交易...');
    const txHash = await openLeveragePosition(leverageParams);
    setStatus(`交易已发送: ${txHash}`);

    // 6. 等待确认
    setStatus('等待交易确认（测试网可能需要1-8分钟）...');
    const result = await watchTx(txHash);

    if (result === 'success') {
      setStatus('一步到位杠杆开仓成功！');
      
      // 7. 获取最新仓位信息
      setStatus('获取最新仓位信息...');
      const positions = await getPositions(address);
      
      onSuccess?.(positions);
      setStatus(`一步到位杠杆开仓成功！交易哈希: ${txHash}\n查看交易: https://sepolia.etherscan.io/tx/${txHash}`);
    } else {
      throw new Error(`交易失败: ${result}\n查看详情: https://sepolia.etherscan.io/tx/${txHash}`);
    }
  };

  const handleTraditionalPosition = async (meta: any, address: `0x${string}`) => {
    setStatus('开始传统开仓...');
    
    // 1. 检查stETH余额
    setStatus('检查stETH余额...');
    const stethBalance = await getTokenBalance(meta.tokens.STETH, address);
    const collateralAmountWei = parseEther(collateralAmount);
    
    if (stethBalance < collateralAmountWei) {
      throw new Error(`stETH余额不足，当前余额: ${formatEther(stethBalance)}`);
    }

    // 2. 确保授权
    setStatus('检查并授权stETH...');
    await ensureApprove(
      meta.tokens.STETH,
      address,
      meta.diamond,
      collateralAmountWei
    );

    // 3. 计算最小铸造FXUSD数量
    const leverageBps = Math.floor(parseFloat(leverage) * 10000);
    const minMintFxUSD = collateralAmountWei * BigInt(leverageBps) / 10000n;

    // 4. 构造开仓参数
    const openPosParams: OpenPositionParams = {
      user: address,
      collateralToken: meta.tokens.STETH,
      collateralAmount: collateralAmountWei,
      targetLeverageBps: leverageBps,
      minMintFxUSD: minMintFxUSD,
      dexSwapData: '0x'
    };

    // 5. 发送开仓交易
    setStatus('发送开仓交易...');
    const txHash = await openPositionFlashLoan(openPosParams);
    setStatus(`交易已发送: ${txHash}`);

    // 6. 等待交易确认
    setStatus('等待交易确认...');
    const result = await watchTx(txHash);

    if (result === 'success') {
      setStatus('开仓成功！');
      
      // 7. 获取最新仓位信息
      setStatus('获取最新仓位信息...');
      const positions = await getPositions(address);
      
      onSuccess?.(positions);
      setStatus(`开仓成功！交易哈希: ${txHash}`);
    } else {
      throw new Error(`交易失败: ${result}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-gray-600">请先连接钱包</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-black">开仓交易</h3>
      
      {/* 交易模式选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          交易模式
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="leverage"
              checked={tradingMode === 'leverage'}
              onChange={(e) => setTradingMode(e.target.value as 'leverage')}
              className="mr-2"
              disabled={isLoading}
            />
            <span className="text-black">一步到位杠杆开仓 (WRMB → WBTC)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="traditional"
              checked={tradingMode === 'traditional'}
              onChange={(e) => setTradingMode(e.target.value as 'traditional')}
              className="mr-2"
              disabled={isLoading}
            />
            <span className="text-black">传统开仓 (stETH抵押)</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {tradingMode === 'leverage' ? (
          // 一步到位杠杆开仓界面
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WRMB数量
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={wrmbAmount}
                onChange={(e) => setWrmbAmount(e.target.value)}
                placeholder="输入WRMB数量"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标WBTC数量
              </label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={wbtcAmount}
                onChange={(e) => setWbtcAmount(e.target.value)}
                placeholder="输入目标WBTC数量"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                杠杆倍数
              </label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                placeholder="输入杠杆倍数"
                disabled={isLoading}
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">一步到位杠杆开仓流程：</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. 用WRMB买WBTC（自有本金）</li>
                <li>2. 闪电贷临时借入更多WBTC</li>
                <li>3. 把「自有WBTC + 闪电贷WBTC」一起存入金库作抵押，铸出FXUSD</li>
                <li>4. 卖出FXUSD → USDC → 买WBTC</li>
                <li>5. 用这部分买到的WBTC归还闪电贷（含手续费）</li>
                <li>6. 交易结束：闪电贷清零，金库里留下更多WBTC作为抵押，账户背上FXUSD债务</li>
              </ol>
            </div>
          </>
        ) : (
          // 传统开仓界面
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                抵押物数量 (stETH)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                placeholder="输入stETH数量"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                杠杆倍数
              </label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                placeholder="输入杠杆倍数"
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <Button
          onClick={handleOpenPosition}
          disabled={isLoading || (tradingMode === 'leverage' ? (!wrmbAmount || !wbtcAmount || !leverage) : (!collateralAmount || !leverage))}
          className="w-full"
        >
          {isLoading ? '处理中...' : (tradingMode === 'leverage' ? '一步到位杠杆开仓' : '传统开仓')}
        </Button>

        {status && (
          <div
            className={`p-3 rounded-md text-sm ${
              status.includes('成功')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : status.includes('错误')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            } whitespace-normal break-words`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
