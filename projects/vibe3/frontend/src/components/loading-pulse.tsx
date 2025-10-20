'use client';

interface LoadingPulseProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  rounded?: boolean;
}

export function LoadingPulse({ 
  width = 100, 
  height = 20, 
  className = '',
  rounded = false 
}: LoadingPulseProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div 
      className={`
        bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 
        animate-pulse
        ${rounded ? 'rounded-full' : 'rounded-md'}
        ${className}
      `}
      style={style}
    />
  );
}

// 渐变色脉冲动画
export function GradientPulse({ 
  width = 100, 
  height = 20, 
  className = '',
  rounded = false 
}: LoadingPulseProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div 
      className={`
        bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 
        animate-pulse
        ${rounded ? 'rounded-full' : 'rounded-md'}
        ${className}
      `}
      style={style}
    />
  );
}

// 带阴影的渐变色脉冲
export function GradientPulseWithShadow({ 
  width = 100, 
  height = 20, 
  className = '',
  rounded = false 
}: LoadingPulseProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div 
      className={`
        bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 
        animate-pulse shadow-lg
        ${rounded ? 'rounded-full' : 'rounded-md'}
        ${className}
      `}
      style={style}
    />
  );
}

// 圆形脉冲动画
export function CirclePulse({ 
  size = 40, 
  className = '' 
}: { size?: number; className?: string }) {
  return (
    <div 
      className={`
        w-${size} h-${size} 
        bg-gradient-to-r from-green-400 via-emerald-500 to-green-400
        animate-pulse rounded-full
        ${className}
      `}
      style={{ width: size, height: size }}
    />
  );
}

// 多圆点脉冲动画
export function DotsPulse({ 
  count = 3, 
  size = 8, 
  spacing = 4, 
  className = '' 
}: { 
  count?: number; 
  size?: number; 
  spacing?: number; 
  className?: string 
}) {
  return (
    <div className={`flex items-center ${className}`} style={{ gap: spacing }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 animate-pulse rounded-full"
          style={{ 
            width: size, 
            height: size,
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  );
}
