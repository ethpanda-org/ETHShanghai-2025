'use client';

import { useState } from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  url?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export function Avatar({ name, size = 'md', url, className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // 处理自定义尺寸
  const isCustomSize = typeof size === 'number';
  const sizeClass = isCustomSize ? '' : sizeClasses[size];
  const customStyle = isCustomSize ? { width: size, height: size, fontSize: size * 0.4 } : {};
  
  // 获取首字母
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // 生成背景色
  const getBackgroundColor = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500', 
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
    ];
    
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const showImage = url && !imageError;
  const initials = getInitials(name);
  const bgColor = getBackgroundColor(name);

  return (
    <div
      className={`
        relative rounded-full flex items-center justify-center
        bg-muted text-muted-foreground font-medium
        ${sizeClass}
        ${className}
      `}
      style={customStyle}
    >
      {showImage ? (
        <img
          src={url}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={`${bgColor} text-white w-full h-full rounded-full flex items-center justify-center`}>
          {initials}
        </span>
      )}
    </div>
  );
}
