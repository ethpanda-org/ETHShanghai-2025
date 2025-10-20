'use client';

export default function AccountInfo() {
  return (
    <div className="h-full flex flex-col bg-[#0A0B0D] text-white overflow-hidden">
      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
        {/* Account标题和操作按钮 */}
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center text-xs">
            <span className="text-gray-400">Account</span>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 h-8 px-3 text-[11px] bg-[#1E2329] hover:bg-[#2B3139] text-[#14B8A6] rounded transition-colors">
              Deposit
            </button>
            <button className="flex-1 h-8 px-3 text-[11px] bg-[#1E2329] hover:bg-[#2B3139] text-[#14B8A6] rounded transition-colors">
              Withdraw
            </button>
            <button className="flex-1 h-8 px-3 text-[11px] bg-[#1E2329] hover:bg-[#2B3139] text-[#14B8A6] rounded transition-colors">
              Transfer
            </button>
          </div>
        </div>

        {/* Account Equity */}
        <div className="flex flex-col gap-2">
          <div className="text-white text-xs">Account Equity</div>
          
          <div className="flex justify-between items-center h-4 text-[11px]">
            <span className="text-gray-500">Spot total value</span>
            <span className="text-white">--</span>
          </div>
          
          <div className="flex justify-between items-center h-4 text-[11px]">
            <span className="text-gray-500">Perp total value</span>
            <span className="text-white">--</span>
          </div>
          
          <div className="flex justify-between items-center h-4 text-[11px]">
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer">Perp Unrealized PNL</span>
            <span className="text-white">--</span>
          </div>
        </div>

        {/* Margin */}
        <div className="flex flex-col gap-2 mt-3">
          <div className="text-white text-xs">Margin</div>
          
          <div className="flex justify-between items-center h-4 text-[11px]">
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer">Account Margin Ratio</span>
            <div className="flex items-center">
              {/* 圆形指示器 */}
              <div className="relative w-5 h-5 mr-1">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.83323 4.59723C7.0666 3.77312 8.51664 3.33325 10 3.33325V5.58325C8.96165 5.58325 7.94662 5.89116 7.08326 6.46804C6.2199 7.04491 5.547 7.86485 5.14964 8.82416C4.75228 9.78348 4.64831 10.8391 4.85088 11.8575C5.05345 12.8759 5.55347 13.8113 6.28769 14.5456L4.6967 16.1366C3.64781 15.0877 2.9335 13.7513 2.64411 12.2964C2.35472 10.8416 2.50325 9.33357 3.07091 7.96313C3.63856 6.59268 4.59986 5.42134 5.83323 4.59723Z" fill="url(#paint0_linear)"/>
                  <path d="M14.1668 4.59723C12.9334 3.77312 11.4834 3.33325 10 3.33325V5.58325C11.0384 5.58325 12.0534 5.89116 12.9167 6.46804C13.7801 7.04491 14.453 7.86485 14.8504 8.82416C15.2477 9.78348 15.3517 10.8391 15.1491 11.8575C14.9466 12.8759 14.4465 13.8113 13.7123 14.5456L15.3033 16.1366C16.3522 15.0877 17.0665 13.7513 17.3559 12.2964C17.6453 10.8416 17.4968 9.33357 16.9291 7.96313C16.3614 6.59268 15.4001 5.42134 14.1668 4.59723Z" fill="url(#paint1_linear)"/>
                  <circle cx="10" cy="10.8334" r="1.66667" fill="#747474"/>
                  <defs>
                    <linearGradient id="paint0_linear" x1="4.58334" y1="15.8333" x2="15.4167" y2="15.8333" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#1DB1A8"/>
                      <stop offset="1" stopColor="#EC6649"/>
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="4.58334" y1="15.8333" x2="15.4167" y2="15.8333" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#1DB1A8"/>
                      <stop offset="1" stopColor="#EC6649"/>
                    </linearGradient>
                  </defs>
                </svg>
                {/* 指针 */}
                <div className="absolute top-0 left-0 w-5 h-5 origin-center transition duration-500" style={{ transform: 'rotate(0deg)' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 10.8333L7.08331 13.7499" stroke="#747474"/>
                  </svg>
                </div>
              </div>
              <span className="text-[#14B8A6]">0.00%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center h-4 text-[11px]">
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer">Account Maintenance Margin</span>
            <span className="text-white">--</span>
          </div>
          
          <div className="flex justify-between items-center h-4 text-[11px]">
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer">Account Equity</span>
            <span className="text-white">--</span>
          </div>
          
          {/* Multi-Asset Mode按钮 */}
          <button className="w-full h-[30px] mt-1.5 px-4 text-[11px] font-light border border-[#1E2329] bg-[#0E1013] hover:bg-[#1E2329] hover:border-[#2B3139] text-white rounded transition-colors">
            Multi-Asset Mode
          </button>
        </div>
      </div>
    </div>
  );
}
