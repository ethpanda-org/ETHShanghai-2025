'use client';

import { useState } from 'react';

interface TradingPanelProps {
  symbol: string;
  leverage: number;
  onLeverageChange: (leverage: number) => void;
  isMobile?: boolean;
}

export default function TradingPanel({ 
  symbol, 
  leverage, 
  onLeverageChange,
  isMobile = false
}: TradingPanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [marginType, setMarginType] = useState<'cross' | 'isolated'>('cross');
  const [price, setPrice] = useState('3882.73');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('0');
  const [showLeverageModal, setShowLeverageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'close'>('open'); // 开仓/平仓切换

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const numAmount = parseFloat(value) || 0;
    const numPrice = parseFloat(price) || 0;
    setTotal((numAmount * numPrice).toFixed(2));
  };

  const leverageOptions = [1, 2, 3, 5, 10, 20, 25, 50, 70];

  if (isMobile) {
    // 移动端简化版
    return (
      <div className="h-full bg-[#0B0E11] flex flex-col overflow-hidden">
        {/* 开仓/平仓标签 */}
        <div className="h-12 border-b border-[#1E2329] flex items-center px-4 flex-shrink-0">
          <div className="flex space-x-4">
            <button 
              onClick={() => setActiveTab('open')}
              className={`text-sm font-medium pb-3 ${
                activeTab === 'open' 
                  ? 'text-white border-b-2 border-[#14B8A6]' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Trades
            </button>
            <button 
              onClick={() => setActiveTab('close')}
              className={`text-sm font-medium pb-3 ${
                activeTab === 'close' 
                  ? 'text-white border-b-2 border-[#14B8A6]' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-3">
          {activeTab === 'open' ? (
            // 开仓界面
            <div className="h-full flex flex-col">
              {/* 杠杆选择 */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">Leverage</span>
                <button
                  onClick={() => setShowLeverageModal(true)}
                  className="flex items-center space-x-1 text-[#14B8A6] hover:text-[#0EA89A] text-sm"
                >
                  <span>{leverage}x</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

        {/* 订单类型和保证金模式 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setOrderType('limit')}
              className={`px-3 py-1.5 text-xs rounded ${
                orderType === 'limit'
                  ? 'bg-[#1E2329] text-white'
                  : 'text-gray-500 hover:bg-[#0E1013]'
              }`}
            >
              Limit
            </button>
            <button
              onClick={() => setOrderType('market')}
              className={`px-3 py-1.5 text-xs rounded ${
                orderType === 'market'
                  ? 'bg-[#1E2329] text-white'
                  : 'text-gray-500 hover:bg-[#0E1013]'
              }`}
            >
              Market
            </button>
          </div>
          
          <button
            onClick={() => setMarginType(marginType === 'cross' ? 'isolated' : 'cross')}
            className="text-xs text-gray-500 hover:text-[#14B8A6]"
          >
            {marginType === 'cross' ? 'Cross' : 'Isolated'}
          </button>
        </div>

        {/* 可用余额 */}
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-gray-500">Avbl</span>
          <span className="text-gray-300">0.00 USDT</span>
        </div>

        {/* 价格输入 */}
        {orderType === 'limit' && (
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">Price (USDT)</label>
            <div className="relative">
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#0E1013] border border-[#1E2329] rounded px-3 py-2 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                USDT
              </span>
            </div>
          </div>
        )}

        {/* 数量输入 */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Size (USDT)</label>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full bg-[#0E1013] border border-[#1E2329] rounded px-3 py-2 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
              placeholder="0.00"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
              USDT
            </span>
          </div>
        </div>

        {/* 百分比滑块 */}
        <div className="space-y-2 mb-3">
          <input
            type="range"
            min="0"
            max="100"
            step="25"
            defaultValue="0"
            className="w-full h-1.5 bg-[#1E2329] rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

              {/* 买入/卖出按钮 - AsterDEX 风格 */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                <button className="py-3 bg-[#14B8A6] hover:bg-[#0EA89A] rounded font-medium text-white text-sm transition-colors">
                  Buy/Long
                </button>
                <button className="py-3 bg-[#EF4444] hover:bg-[#DC2626] rounded font-medium text-white text-sm transition-colors">
                  Sell/Short
                </button>
              </div>
            </div>
          ) : (
            // 平仓界面 - 移动端优化
            <div className="h-full flex flex-col">
              {/* 当前持仓卡片 */}
              <div className="mb-3 p-3 bg-[#0E1013] border border-[#1E2329] rounded">
                <div className="text-xs text-gray-500 mb-2">Current Position</div>
                <div className="text-center py-6 text-gray-500 text-xs">
                  No Position
                </div>
              </div>

              <div className="space-y-3 flex-1 flex flex-col">
                {/* 可平仓位 */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Available</span>
                  <span className="text-gray-300">0 ETH</span>
                </div>

                {/* 平仓数量 */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Close Size (ETH)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[#0E1013] border border-[#1E2329] rounded px-3 py-2 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                      ETH
                    </span>
                  </div>
                </div>

                {/* 百分比滑块 */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="25"
                    defaultValue="0"
                    className="w-full h-1.5 bg-[#1E2329] rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* 平仓按钮 */}
                <button 
                  className="w-full py-3 bg-[#14B8A6] hover:bg-[#0EA89A] rounded font-medium text-white text-sm transition-colors mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled
                >
                  Close Position
                </button>

                {/* 提示信息 */}
                <div className="text-xs text-gray-500 text-center p-2.5 bg-[#0E1013] border border-[#1E2329] rounded">
                  Open a position first to close
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 杠杆选择模态框 - AsterDEX 风格 */}
        {showLeverageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0E1013] border border-[#1E2329] rounded-lg p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Adjust Leverage</h3>
                <button
                  onClick={() => setShowLeverageModal(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Current</span>
                  <span className="text-[#14B8A6] text-xl font-bold">{leverage}x</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {leverageOptions.map((lev) => (
                    <button
                      key={lev}
                      onClick={() => {
                        onLeverageChange(lev);
                        setShowLeverageModal(false);
                      }}
                      className={`py-3 rounded text-sm font-medium transition-colors ${
                        leverage === lev
                          ? 'bg-[#14B8A6] text-white'
                          : 'bg-[#1E2329] text-gray-400 hover:bg-[#2B3139] hover:text-white'
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>

                <div className="pt-4">
                  <input
                    type="range"
                    min="1"
                    max="125"
                    value={leverage}
                    onChange={(e) => onLeverageChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#1E2329] rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>1x</span>
                    <span>125x</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowLeverageModal(false)}
                  className="w-full py-3 bg-[#14B8A6] hover:bg-[#0EA89A] rounded text-white font-medium transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 桌面端完整版 - AsterDEX 风格
  return (
    <div className="h-full bg-[#0A0B0D] flex flex-col overflow-hidden">
      {/* 头部标签 - AsterDEX 风格 */}
      <div className="h-10 border-b border-[#1E2329] flex items-center px-3 flex-shrink-0">
        <div className="flex space-x-4">
          <button 
            onClick={() => setActiveTab('open')}
            className={`text-sm font-medium pb-2 ${
              activeTab === 'open' 
                ? 'text-white border-b-2 border-[#14B8A6]' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Trades
          </button>
          <button 
            onClick={() => setActiveTab('close')}
            className={`text-sm font-medium pb-2 ${
              activeTab === 'close' 
                ? 'text-white border-b-2 border-[#14B8A6]' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Close
          </button>
        </div>
      </div>

      {/* 交易表单 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {activeTab === 'open' ? (
          // 开仓表单
          <>
        {/* 订单类型 - AsterDEX 风格 */}
        <div className="flex space-x-2">
          <button
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-1.5 text-[11px] rounded ${
              orderType === 'limit'
                ? 'bg-[#1E2329] text-white'
                : 'text-gray-500 hover:bg-[#0E1013]'
            }`}
          >
            Limit
          </button>
          <button
            onClick={() => setOrderType('market')}
            className={`flex-1 py-1.5 text-[11px] rounded ${
              orderType === 'market'
                ? 'bg-[#1E2329] text-white'
                : 'text-gray-500 hover:bg-[#0E1013]'
            }`}
          >
            Market
          </button>
        </div>

        {/* 保证金模式和杠杆 - AsterDEX 风格 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMarginType(marginType === 'cross' ? 'isolated' : 'cross')}
              className="text-[11px] text-gray-500 hover:text-[#14B8A6]"
            >
              {marginType === 'cross' ? 'Cross' : 'Isolated'}
            </button>
          </div>
          
          <button
            onClick={() => setShowLeverageModal(true)}
            className="flex items-center space-x-1 text-[#14B8A6] hover:text-[#0EA89A] text-xs"
          >
            <span>{leverage}x</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 可用余额 */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">Avbl</span>
          <span className="text-gray-300">0.00 USDT</span>
        </div>

        {/* 价格输入 - AsterDEX 风格 */}
        {orderType === 'limit' && (
          <div className="space-y-1">
            <label className="text-[11px] text-gray-500">Price (USDT)</label>
            <div className="relative">
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#0E1013] border border-[#1E2329] rounded px-2 py-1.5 text-xs text-white focus:border-[#14B8A6] focus:outline-none"
                placeholder="0.00"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">
                USDT
              </span>
            </div>
          </div>
        )}

        {/* 数量输入 - AsterDEX 风格 */}
        <div className="space-y-1">
          <label className="text-[11px] text-gray-500">Size (USDT)</label>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full bg-[#0E1013] border border-[#1E2329] rounded px-2 py-1.5 text-xs text-white focus:border-[#14B8A6] focus:outline-none"
              placeholder="0.00"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">
              USDT
            </span>
          </div>
        </div>

        {/* 百分比滑块 */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="100"
            step="25"
            defaultValue="0"
            className="w-full h-1 bg-[#1E2329] rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* 总计 */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">Sum (USDT)</span>
          <span className="text-gray-300">{total}</span>
        </div>

        {/* 买入/卖出按钮 - AsterDEX 风格 */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="py-2 bg-[#14B8A6] hover:bg-[#0EA89A] rounded font-medium text-white text-xs transition-colors">
            Buy/Long
          </button>
          <button className="py-2 bg-[#EF4444] hover:bg-[#DC2626] rounded font-medium text-white text-xs transition-colors">
            Sell/Short
          </button>
        </div>

        </>
        ) : (
          // 平仓表单 - AsterDEX 风格
          <>
            {/* 当前持仓卡片 */}
            <div className="p-3 bg-[#0E1013] border border-[#1E2329] rounded">
              <div className="text-[11px] text-gray-500 mb-2">Current Position</div>
              <div className="text-center py-6 text-gray-500 text-[10px]">
                No Position
              </div>
            </div>

            <div className="space-y-3 mt-3">
              {/* 可平仓位 */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500">Available</span>
                <span className="text-gray-300">0 ETH</span>
              </div>

              {/* 平仓数量输入 - AsterDEX 风格 */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500">Close Size (ETH)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#0E1013] border border-[#1E2329] rounded px-2 py-1.5 text-xs text-white focus:border-[#14B8A6] focus:outline-none"
                    placeholder="0.00"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">
                    ETH
                  </span>
                </div>
              </div>

              {/* 百分比滑块 */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="25"
                  defaultValue="0"
                  className="w-full h-1 bg-[#1E2329] rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* 平仓按钮 - AsterDEX 风格 */}
              <button 
                className="w-full py-2 bg-[#14B8A6] hover:bg-[#0EA89A] rounded font-medium text-white text-xs transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                Close Position
              </button>

              {/* 提示信息 */}
              <div className="text-[10px] text-gray-500 text-center mt-2 p-2 bg-[#0E1013] border border-[#1E2329] rounded">
                Open a position first to close
              </div>
            </div>
          </>
        )}
      </div>

      {/* 杠杆选择模态框 - AsterDEX 风格 */}
      {showLeverageModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0E1013] border border-[#1E2329] rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Adjust Leverage</h3>
              <button
                onClick={() => setShowLeverageModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Current</span>
                <span className="text-[#14B8A6] font-semibold text-lg">{leverage}x</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {leverageOptions.map((lev) => (
                  <button
                    key={lev}
                    onClick={() => {
                      onLeverageChange(lev);
                      setShowLeverageModal(false);
                    }}
                    className={`py-2 rounded text-sm font-medium transition-colors ${
                      leverage === lev
                        ? 'bg-[#14B8A6] text-white'
                        : 'bg-[#1E2329] text-gray-400 hover:bg-[#2B3139] hover:text-white'
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <input
                  type="range"
                  min="1"
                  max="125"
                  value={leverage}
                  onChange={(e) => onLeverageChange(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#1E2329] rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1x</span>
                  <span>125x</span>
                </div>
              </div>

              <button
                onClick={() => setShowLeverageModal(false)}
                className="w-full py-2 bg-[#14B8A6] hover:bg-[#0EA89A] rounded text-white font-medium transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

