'use client'

import React from 'react'

interface StarfieldBgProps {
  className?: string
}

export function StarfieldBg({ className = '' }: StarfieldBgProps) {

  // 硬编码的星星数据
  const stars = [
    { id: 0, x: 12.5, y: 8.3, size: 2.1, opacity: 0.8, twinkleDelay: 0.2 },
    { id: 1, x: 87.2, y: 15.7, size: 1.4, opacity: 0.6, twinkleDelay: 1.1 },
    { id: 2, x: 23.8, y: 32.1, size: 3.2, opacity: 0.9, twinkleDelay: 2.3 },
    { id: 3, x: 65.4, y: 28.9, size: 1.8, opacity: 0.7, twinkleDelay: 0.8 },
    { id: 4, x: 45.6, y: 12.4, size: 2.5, opacity: 0.85, twinkleDelay: 1.7 },
    { id: 5, x: 78.9, y: 45.2, size: 1.2, opacity: 0.5, twinkleDelay: 2.8 },
    { id: 6, x: 15.3, y: 67.8, size: 2.8, opacity: 0.9, twinkleDelay: 0.5 },
    { id: 7, x: 92.1, y: 73.4, size: 1.6, opacity: 0.6, twinkleDelay: 1.9 },
    { id: 8, x: 34.7, y: 89.2, size: 2.3, opacity: 0.8, twinkleDelay: 2.1 },
    { id: 9, x: 56.8, y: 56.7, size: 1.9, opacity: 0.7, twinkleDelay: 0.3 },
    { id: 10, x: 8.4, y: 41.5, size: 3.1, opacity: 0.95, twinkleDelay: 1.4 },
    { id: 11, x: 73.2, y: 8.9, size: 1.3, opacity: 0.5, twinkleDelay: 2.6 },
    { id: 12, x: 29.6, y: 76.3, size: 2.4, opacity: 0.8, twinkleDelay: 0.9 },
    { id: 13, x: 81.5, y: 62.1, size: 1.7, opacity: 0.6, twinkleDelay: 1.8 },
    { id: 14, x: 42.3, y: 35.8, size: 2.6, opacity: 0.85, twinkleDelay: 2.4 },
    { id: 15, x: 67.9, y: 18.6, size: 1.5, opacity: 0.6, twinkleDelay: 0.7 },
    { id: 16, x: 18.7, y: 54.2, size: 2.9, opacity: 0.9, twinkleDelay: 1.6 },
    { id: 17, x: 85.4, y: 37.9, size: 1.4, opacity: 0.5, twinkleDelay: 2.2 },
    { id: 18, x: 51.2, y: 81.5, size: 2.2, opacity: 0.8, twinkleDelay: 0.4 },
    { id: 19, x: 36.8, y: 23.7, size: 2.7, opacity: 0.85, twinkleDelay: 1.3 },
    { id: 20, x: 74.1, y: 68.4, size: 1.6, opacity: 0.6, twinkleDelay: 2.7 },
    { id: 21, x: 13.9, y: 85.6, size: 3.0, opacity: 0.95, twinkleDelay: 0.6 },
    { id: 22, x: 59.3, y: 14.2, size: 1.8, opacity: 0.7, twinkleDelay: 1.5 },
    { id: 23, x: 26.4, y: 48.9, size: 2.5, opacity: 0.8, twinkleDelay: 2.0 },
    { id: 25, x: 47.5, y: 67.1, size: 2.4, opacity: 0.8, twinkleDelay: 1.7 },
    { id: 26, x: 71.6, y: 31.8, size: 1.7, opacity: 0.6, twinkleDelay: 2.5 },
    { id: 27, x: 22.1, y: 19.4, size: 2.8, opacity: 0.9, twinkleDelay: 0.2 },
    { id: 28, x: 64.8, y: 75.2, size: 1.5, opacity: 0.6, twinkleDelay: 1.4 },
    { id: 29, x: 39.2, y: 42.6, size: 2.6, opacity: 0.85, twinkleDelay: 2.3 },
    { id: 30, x: 76.5, y: 9.7, size: 1.4, opacity: 0.5, twinkleDelay: 0.9 },
    { id: 31, x: 17.8, y: 63.5, size: 2.9, opacity: 0.9, twinkleDelay: 1.8 },
    { id: 32, x: 53.4, y: 28.3, size: 2.1, opacity: 0.8, twinkleDelay: 2.6 },
    { id: 33, x: 82.9, y: 46.8, size: 1.6, opacity: 0.6, twinkleDelay: 0.5 },
    { id: 35, x: 68.3, y: 58.7, size: 1.8, opacity: 0.7, twinkleDelay: 2.1 },
    { id: 36, x: 14.6, y: 37.2, size: 3.1, opacity: 0.95, twinkleDelay: 0.7 },
    { id: 37, x: 57.9, y: 72.4, size: 2.0, opacity: 0.8, twinkleDelay: 1.6 },
    { id: 38, x: 25.3, y: 84.1, size: 2.5, opacity: 0.8, twinkleDelay: 2.4 },
    { id: 40, x: 43.8, y: 59.3, size: 2.4, opacity: 0.8, twinkleDelay: 1.5 },
    { id: 41, x: 72.4, y: 41.7, size: 1.7, opacity: 0.6, twinkleDelay: 2.2 },
    { id: 42, x: 19.5, y: 26.8, size: 2.8, opacity: 0.9, twinkleDelay: 0.8 },
    { id: 43, x: 61.7, y: 83.6, size: 1.9, opacity: 0.7, twinkleDelay: 1.3 },
    { id: 44, x: 35.9, y: 16.4, size: 2.6, opacity: 0.85, twinkleDelay: 2.0 },
    { id: 46, x: 48.6, y: 33.7, size: 2.3, opacity: 0.8, twinkleDelay: 1.7 },
    { id: 48, x: 74.8, y: 14.8, size: 1.6, opacity: 0.6, twinkleDelay: 0.4 },
    { id: 49, x: 16.4, y: 49.6, size: 2.9, opacity: 0.9, twinkleDelay: 1.4 },
    { id: 50, x: 52.7, y: 65.2, size: 2.1, opacity: 0.8, twinkleDelay: 2.3 },
    { id: 51, x: 83.5, y: 38.4, size: 1.5, opacity: 0.6, twinkleDelay: 0.9 },
    { id: 52, x: 38.1, y: 78.9, size: 2.6, opacity: 0.85, twinkleDelay: 1.6 },
    { id: 53, x: 69.7, y: 22.3, size: 1.8, opacity: 0.7, twinkleDelay: 2.1 },
    { id: 54, x: 21.8, y: 57.4, size: 2.8, opacity: 0.9, twinkleDelay: 0.5 },
    { id: 55, x: 55.3, y: 41.8, size: 2.2, opacity: 0.8, twinkleDelay: 1.2 },
    { id: 56, x: 77.2, y: 56.9, size: 1.6, opacity: 0.6, twinkleDelay: 2.4 },
    { id: 57, x: 33.6, y: 29.5, size: 2.7, opacity: 0.85, twinkleDelay: 0.7 },
    { id: 58, x: 64.1, y: 87.3, size: 1.9, opacity: 0.7, twinkleDelay: 1.5 },
    { id: 60, x: 46.9, y: 18.7, size: 2.4, opacity: 0.8, twinkleDelay: 0.3 },
    { id: 61, x: 78.3, y: 63.2, size: 1.5, opacity: 0.6, twinkleDelay: 1.8 },
    { id: 62, x: 24.5, y: 35.9, size: 2.5, opacity: 0.8, twinkleDelay: 2.6 },
    { id: 63, x: 58.7, y: 79.4, size: 2.0, opacity: 0.8, twinkleDelay: 0.6 },
    { id: 64, x: 41.2, y: 13.6, size: 2.6, opacity: 0.85, twinkleDelay: 1.3 },
    { id: 65, x: 75.9, y: 47.1, size: 1.7, opacity: 0.6, twinkleDelay: 2.0 },
    { id: 66, x: 18.3, y: 82.7, size: 2.9, opacity: 0.9, twinkleDelay: 0.8 },
    { id: 67, x: 62.4, y: 36.5, size: 1.8, opacity: 0.7, twinkleDelay: 1.7 },
    { id: 68, x: 29.8, y: 61.8, size: 2.5, opacity: 0.8, twinkleDelay: 2.3 },
    { id: 69, x: 71.5, y: 9.2, size: 1.6, opacity: 0.6, twinkleDelay: 0.4 },
    { id: 73, x: 49.3, y: 55.9, size: 2.3, opacity: 0.8, twinkleDelay: 1.6 },
    { id: 74, x: 80.6, y: 19.3, size: 1.4, opacity: 0.5, twinkleDelay: 2.4 },
    { id: 75, x: 26.9, y: 67.2, size: 2.5, opacity: 0.8, twinkleDelay: 0.2 },
    { id: 76, x: 54.1, y: 32.8, size: 2.1, opacity: 0.8, twinkleDelay: 1.1 },
    { id: 77, x: 73.7, y: 58.4, size: 1.7, opacity: 0.6, twinkleDelay: 2.5 },
    { id: 78, x: 32.2, y: 15.9, size: 2.7, opacity: 0.85, twinkleDelay: 0.7 },
    { id: 80, x: 20.6, y: 42.3, size: 2.8, opacity: 0.9, twinkleDelay: 2.2 },
    { id: 81, x: 51.8, y: 69.1, size: 2.2, opacity: 0.8, twinkleDelay: 0.5 },
    { id: 85, x: 17.2, y: 59.7, size: 2.9, opacity: 0.9, twinkleDelay: 1.5 },
    { id: 86, x: 43.7, y: 86.3, size: 2.4, opacity: 0.8, twinkleDelay: 2.3 },
    { id: 87, x: 76.1, y: 51.2, size: 1.6, opacity: 0.6, twinkleDelay: 0.3 },
    { id: 89, x: 59.6, y: 78.1, size: 2.0, opacity: 0.8, twinkleDelay: 2.6 },
    { id: 90, x: 39.8, y: 37.4, size: 2.6, opacity: 0.85, twinkleDelay: 0.6 },
    { id: 91, x: 72.3, y: 64.8, size: 1.7, opacity: 0.6, twinkleDelay: 1.4 },
    { id: 92, x: 22.7, y: 16.8, size: 2.8, opacity: 0.9, twinkleDelay: 2.1 },
    { id: 93, x: 56.4, y: 43.2, size: 2.1, opacity: 0.8, twinkleDelay: 0.9 },
    { id: 94, x: 81.8, y: 72.5, size: 1.4, opacity: 0.5, twinkleDelay: 1.7 },
    { id: 95, x: 31.3, y: 54.6, size: 2.7, opacity: 0.85, twinkleDelay: 2.4 },
    { id: 97, x: 14.8, y: 81.9, size: 3.0, opacity: 0.95, twinkleDelay: 1.1 },
    { id: 98, x: 47.2, y: 26.7, size: 2.3, opacity: 0.8, twinkleDelay: 1.8 },
    { id: 99, x: 79.4, y: 48.3, size: 1.5, opacity: 0.6, twinkleDelay: 2.5 },
    { id: 100, x: 25.6, y: 73.1, size: 2.5, opacity: 0.8, twinkleDelay: 0.7 },
    { id: 101, x: 58.2, y: 19.6, size: 2.0, opacity: 0.8, twinkleDelay: 1.4 },
    { id: 102, x: 82.5, y: 65.7, size: 1.6, opacity: 0.6, twinkleDelay: 2.2 },
    { id: 104, x: 69.3, y: 76.8, size: 1.8, opacity: 0.7, twinkleDelay: 1.3 },
    { id: 105, x: 19.7, y: 45.8, size: 2.8, opacity: 0.9, twinkleDelay: 2.0 },
    { id: 106, x: 53.8, y: 62.4, size: 2.1, opacity: 0.8, twinkleDelay: 0.8 },
    { id: 107, x: 74.6, y: 17.9, size: 1.7, opacity: 0.6, twinkleDelay: 1.6 },
    { id: 108, x: 27.3, y: 39.7, size: 2.5, opacity: 0.8, twinkleDelay: 2.3 },
    { id: 110, x: 42.6, y: 14.8, size: 2.6, opacity: 0.85, twinkleDelay: 1.0 },
    { id: 111, x: 77.8, y: 53.6, size: 1.6, opacity: 0.6, twinkleDelay: 1.7 },
    { id: 112, x: 23.4, y: 68.9, size: 2.8, opacity: 0.9, twinkleDelay: 2.4 },
    { id: 113, x: 55.7, y: 35.1, size: 2.2, opacity: 0.8, twinkleDelay: 0.6 },
    { id: 114, x: 86.8, y: 21.4, size: 1.4, opacity: 0.5, twinkleDelay: 1.3 },
    { id: 116, x: 67.6, y: 42.9, size: 1.8, opacity: 0.7, twinkleDelay: 0.9 },
    { id: 117, x: 16.9, y: 25.7, size: 2.9, opacity: 0.9, twinkleDelay: 1.6 },
    { id: 118, x: 48.3, y: 71.8, size: 2.3, opacity: 0.8, twinkleDelay: 2.1 },
    { id: 119, x: 80.2, y: 38.7, size: 1.5, opacity: 0.6, twinkleDelay: 0.4 },
    { id: 120, x: 29.5, y: 12.6, size: 2.7, opacity: 0.85, twinkleDelay: 1.1 },
    { id: 121, x: 63.8, y: 67.4, size: 1.9, opacity: 0.7, twinkleDelay: 1.8 },
    { id: 123, x: 54.6, y: 24.8, size: 2.1, opacity: 0.8, twinkleDelay: 0.7 },
    { id: 124, x: 78.7, y: 79.6, size: 1.6, opacity: 0.6, twinkleDelay: 1.4 },
    { id: 125, x: 37.8, y: 46.3, size: 2.6, opacity: 0.85, twinkleDelay: 2.2 },
    { id: 126, x: 70.4, y: 13.7, size: 1.8, opacity: 0.7, twinkleDelay: 0.5 },
    { id: 127, x: 18.6, y: 72.4, size: 2.9, opacity: 0.9, twinkleDelay: 1.2 },
    { id: 129, x: 85.7, y: 56.2, size: 1.4, opacity: 0.5, twinkleDelay: 2.6 },
    { id: 130, x: 34.4, y: 83.1, size: 2.6, opacity: 0.85, twinkleDelay: 0.8 },
    { id: 131, x: 66.2, y: 29.6, size: 1.8, opacity: 0.7, twinkleDelay: 1.5 },
    { id: 132, x: 24.7, y: 61.3, size: 2.5, opacity: 0.8, twinkleDelay: 2.3 },
    { id: 133, x: 57.3, y: 16.8, size: 2.0, opacity: 0.8, twinkleDelay: 0.2 },
    { id: 135, x: 40.5, y: 52.7, size: 2.6, opacity: 0.85, twinkleDelay: 1.6 },
    { id: 136, x: 73.9, y: 27.4, size: 1.7, opacity: 0.6, twinkleDelay: 2.4 },
    { id: 137, x: 26.8, y: 85.6, size: 2.5, opacity: 0.8, twinkleDelay: 0.6 },
    { id: 138, x: 59.1, y: 43.7, size: 2.0, opacity: 0.8, twinkleDelay: 1.3 },
    { id: 139, x: 84.6, y: 11.9, size: 1.4, opacity: 0.5, twinkleDelay: 2.0 },
    { id: 141, x: 65.3, y: 33.2, size: 1.9, opacity: 0.7, twinkleDelay: 1.1 },
    { id: 142, x: 20.4, y: 18.5, size: 2.8, opacity: 0.9, twinkleDelay: 1.8 },
    { id: 143, x: 51.6, y: 75.9, size: 2.2, opacity: 0.8, twinkleDelay: 2.5 },
    { id: 144, x: 76.4, y: 44.6, size: 1.6, opacity: 0.6, twinkleDelay: 0.7 },
    { id: 146, x: 68.7, y: 58.1, size: 1.8, opacity: 0.7, twinkleDelay: 2.1 },
    { id: 148, x: 49.8, y: 63.4, size: 2.3, opacity: 0.8, twinkleDelay: 1.0 },
    { id: 149, x: 82.3, y: 29.7, size: 1.5, opacity: 0.6, twinkleDelay: 1.7 }
  ]

  return (
    <div className={`absolute inset-0 overflow-hidden ${className} z-[1]`}>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 星星发光滤镜 */}
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* 大星星发光滤镜 */}
          <filter id="bigStarGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* 闪烁动画 */}
          <animate id="twinkle" attributeName="opacity" 
            values="0.3;1;0.3" 
            dur="3s" 
            repeatCount="indefinite"
          />
        </defs>
        
        {/* 渲染星星 */}
        {stars.map((star) => (
          <circle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={star.size / 2}
            fill="currentColor"
            opacity={star.opacity}
            filter={star.size > 2 ? "url(#bigStarGlow)" : "url(#starGlow)"}
            className="text-foreground/60"
          >
            <animate
              attributeName="opacity"
              values={`${star.opacity * 0.3};${star.opacity};${star.opacity * 0.3}`}
              dur="3s"
              begin={`${star.twinkleDelay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        
      </svg>
    </div>
  )
}
