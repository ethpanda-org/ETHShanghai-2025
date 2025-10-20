'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-transparent text-slate-50">
      <div className="mx-auto max-w-7xl pt-8 md:py-16">
        {/* 顶部区域：Logo、导航链接和社交媒体 */}
        <div className="flex flex-col items-center justify-between md:flex-row">
          {/* Logo 和品牌名称 */}
          <div className="flex flex-row items-center max-md:mb-4">
            <img 
              src="/support/cina-logo-white.svg" 
              alt="CINA Logo" 
              className="w-[36px] h-[36px] object-contain"
            />
            <div className="ml-4 text-[36px]">CINA</div>
          </div>

          {/* 桌面端：文档链接 */}
          <div className="flex flex-row items-center justify-between gap-8 max-md:hidden">
            <Link 
              href="/docs" 
              className="text-lg hover:text-slate-300 transition-colors"
            >
              文档
            </Link>
          </div>

          {/* 移动端：文档链接 */}
          <div className="sm:gap-12 mb-4 flex flex-row items-center justify-between gap-4 max-sm:flex-wrap max-sm:justify-center md:hidden">
            <Link 
              href="/docs" 
              className="text-md sm:text-xl hover:text-slate-300 transition-colors"
            >
              文档
            </Link>
            <Link 
              href="/main" 
              className="text-md sm:text-xl hover:text-slate-300 transition-colors"
            >
              主应用
            </Link>
                </div>

          {/* 移动端：社交媒体图标 */}
          <div className="flex flex-row items-center justify-between gap-8 md:hidden">
            {/* Twitter/X */}
            <a 
              href="https://twitter.com" 
              target="_blank" 
              className="text-xl hover:text-slate-300 transition-colors" 
              rel="noreferrer"
            >
              <svg width="20" height="20" viewBox="0 0 300 300.251" version="1.1" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current">
                <path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"></path>
              </svg>
            </a>

            {/* Telegram */}
            <a 
              href="https://t.me" 
              target="_blank" 
              className="text-xl hover:text-slate-300 transition-colors" 
              rel="noreferrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20px" height="20px" fill="currentColor">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"></path>
              </svg>
            </a>

            {/* GitHub */}
            <a 
              href="https://github.com" 
              target="_blank" 
              className="text-xl hover:text-slate-300 transition-colors" 
              rel="noreferrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="20px" height="20px">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
            </a>

            {/* Discord */}
            <a 
              href="https://discord.com" 
              target="_blank" 
              className="text-xl hover:text-slate-300 transition-colors" 
              rel="noreferrer"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px">
                <path d="M16.96 3.26A15.827 15.827 0 0 0 12.951 2a11.75 11.75 0 0 0-.513 1.066 14.72 14.72 0 0 0-4.443 0c-.14-.334-.345-.754-.52-1.066a15.773 15.773 0 0 0-4.012 1.263C.926 7.097.24 10.835.583 14.52a16.029 16.029 0 0 0 4.916 2.52c.396-.546.749-1.125 1.053-1.735-.58-.22-1.134-.492-1.658-.807.139-.103.275-.21.406-.322 3.198 1.496 6.672 1.496 9.83 0 .134.111.27.219.407.322-.526.317-1.082.588-1.661.808.304.61.656 1.19 1.053 1.735a15.996 15.996 0 0 0 4.92-2.521c.403-4.273-.69-7.977-2.889-11.261Zm-9.972 8.994c-.96 0-1.747-.896-1.747-1.987 0-1.091.77-1.989 1.747-1.989.976 0 1.763.896 1.747 1.989.001 1.091-.77 1.987-1.747 1.987Zm6.455 0c-.96 0-1.746-.896-1.746-1.987 0-1.091.77-1.989 1.746-1.989.977 0 1.764.896 1.747 1.989 0 1.091-.77 1.987-1.747 1.987Z"></path>
              </svg>
            </a>
          </div>
        </div>

        {/* 底部区域：版权和桌面端社交媒体 */}
        <div className="mt-4 flex flex-row items-center justify-center font-light sm:mt-8 md:justify-between">
          <div className="text-slate-400">©2025 保留所有权利 - CINA</div>
          
          {/* 桌面端：社交媒体图标 */}
          <div className="flex flex-row items-center justify-between gap-8 max-md:hidden">
            {/* Twitter/X */}
            <a 
              href="https://twitter.com" 
              target="_blank" 
              className="h-[20px] w-[20px] text-lg hover:text-slate-300 transition-colors" 
              rel="noreferrer"
            >
              <svg width="300" height="300.251" version="1.1" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 300 300.251">
                <path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"></path>
              </svg>
            </a>

            {/* Telegram */}
            <a 
              href="https://t.me" 
              target="_blank" 
              className="text-lg hover:text-slate-300 transition-colors" 
              rel="noreferrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20px" height="20px" fill="currentColor">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"></path>
              </svg>
            </a>

            {/* GitHub */}
            <a 
              href="https://github.com" 
              target="_blank" 
              className="text-lg hover:text-slate-300 transition-colors" 
              rel="noreferrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="20px" height="20px">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
            </a>

            {/* Discord */}
            <a 
              href="https://discord.com" 
              target="_blank" 
              className="text-lg hover:text-slate-300 transition-colors" 
              rel="noreferrer"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px">
                <path d="M16.96 3.26A15.827 15.827 0 0 0 12.951 2a11.75 11.75 0 0 0-.513 1.066 14.72 14.72 0 0 0-4.443 0c-.14-.334-.345-.754-.52-1.066a15.773 15.773 0 0 0-4.012 1.263C.926 7.097.24 10.835.583 14.52a16.029 16.029 0 0 0 4.916 2.52c.396-.546.749-1.125 1.053-1.735-.58-.22-1.134-.492-1.658-.807.139-.103.275-.21.406-.322 3.198 1.496 6.672 1.496 9.83 0 .134.111.27.219.407.322-.526.317-1.082.588-1.661.808.304.61.656 1.19 1.053 1.735a15.996 15.996 0 0 0 4.92-2.521c.403-4.273-.69-7.977-2.889-11.261Zm-9.972 8.994c-.96 0-1.747-.896-1.747-1.987 0-1.091.77-1.989 1.747-1.989.976 0 1.763.896 1.747 1.989.001 1.091-.77 1.987-1.747 1.987Zm6.455 0c-.96 0-1.746-.896-1.746-1.987 0-1.091.77-1.989 1.746-1.989.977 0 1.764.896 1.747 1.989 0 1.091-.77 1.987-1.747 1.987Z"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
