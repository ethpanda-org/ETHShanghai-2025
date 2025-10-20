import React from 'react';

type Props = { variant?: 'compact' | 'full' | 'header' | 'mark' };

export default function Logo({ variant = 'compact' }: Props) {
  if (variant === 'full') {
    return (
      <svg width="220" height="260" viewBox="0 0 400 450" xmlns="http://www.w3.org/2000/svg" aria-label="Family Key Logo">
        <defs>
          <linearGradient id="gold-gradient" gradientUnits="userSpaceOnUse" x1={90} y1={90} x2={310} y2={310}>
            <stop offset="0%" style={{ stopColor: '#DAB974' }} />
            <stop offset="50%" style={{ stopColor: '#c5a35a' }} />
            <stop offset="100%" style={{ stopColor: '#B88B4A' }} />
            {/* 通过动画在四个角之间移动渐变向量，以制造顺时针流动感 */}
            <animate attributeName="x1" values="90;310;310;90;90" dur="6s" repeatCount="indefinite" />
            <animate attributeName="y1" values="90;90;310;310;90" dur="6s" repeatCount="indefinite" />
            <animate attributeName="x2" values="310;90;90;310;310" dur="6s" repeatCount="indefinite" />
            <animate attributeName="y2" values="310;310;90;90;310" dur="6s" repeatCount="indefinite" />
          </linearGradient>
          {/* 用于移动条带的深到浅金色渐变 */}
          <linearGradient id="band-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#B88B4A' }} />
            <stop offset="100%" style={{ stopColor: '#F3DCAC' }} />
          </linearGradient>
        </defs>
        {/* 外框与内框 */}
        <rect x="90" y="90" width="220" height="220" rx={5} ry={5} fill="url(#gold-gradient)" />
        <rect x="100" y="100" width="200" height="200" rx={5} ry={5} fill="#3c4858" />
        {/* 钥匙孔形状 */}
        <path d="M 167.5 270 L 232.5 270 L 215.5 190 A 30 30 0 1 0 184.5 190 Z" fill="#FFFFFF" />
        {/* 顺时针移动的金色条带（叠加在边框上方，长度=单边宽度） */}
        <rect
          x="95" y="95" width="210" height="210" rx={5} ry={5}
          fill="none" stroke="url(#band-gradient)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round"
          className="border-band"
          strokeDasharray="210 621" strokeDashoffset={0}
          style={{ ['--band-len' as any]: '210', ['--band-gap' as any]: '621', animation: 'none' }}
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-831" dur="5s" repeatCount="indefinite" />
        </rect>
        {/* 下方的品牌文字 */}
        <text x="200" y="380" fontSize={56} textAnchor="middle" fontWeight={400}>
          <tspan fill="#3c4858">Family</tspan>
          <tspan fill="#c5a35a" fontWeight={500}> Key</tspan>
        </text>
      </svg>
    );
  }

  // 图形标志版本：只显示方块与钥匙孔（无文字）
  if (variant === 'mark') {
    return (
      <svg width="140" height="140" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-label="Family Key Mark">
        <defs>
          <linearGradient id="gold-gradient" gradientUnits="userSpaceOnUse" x1={90} y1={90} x2={310} y2={310}>
            <stop offset="0%" style={{ stopColor: '#DAB974' }} />
            <stop offset="50%" style={{ stopColor: '#c5a35a' }} />
            <stop offset="100%" style={{ stopColor: '#B88B4A' }} />
          </linearGradient>
          <linearGradient id="band-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#B88B4A' }} />
            <stop offset="100%" style={{ stopColor: '#F3DCAC' }} />
          </linearGradient>
        </defs>
        <rect x="90" y="90" width="220" height="220" rx={5} ry={5} fill="url(#gold-gradient)" />
        <rect x="100" y="100" width="200" height="200" rx={5} ry={5} fill="#3c4858" />
        <path d="M 167.5 270 L 232.5 270 L 215.5 190 A 30 30 0 1 0 184.5 190 Z" fill="#FFFFFF" />
        <rect
          x="95" y="95" width="210" height="210" rx={5} ry={5}
          fill="none" stroke="url(#band-gradient)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round"
          className="border-band"
          strokeDasharray="210 621" strokeDashoffset={0}
          style={{ ['--band-len' as any]: '210', ['--band-gap' as any]: '621', animation: 'none' }}
        >
          <animate attributeName="stroke-dashoffset" values="0;-207.75;-415.5;-623.25;-831" keyTimes="0;0.25;0.5;0.75;1" dur="7s" calcMode="linear" repeatCount="indefinite" />
        </rect>
      </svg>
    );
  }

  if (variant === 'header') {
    // 横向版本：左侧为方块logo，右侧为品牌文字，颜色与 logo.html 保持一致
    return (
      <svg className="brand-header" width="220" height="60" viewBox="0 0 440 120" xmlns="http://www.w3.org/2000/svg" aria-label="Family Key Logo">
        <defs>
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#DAB974' }} />
            <stop offset="100%" style={{ stopColor: '#B88B4A' }} />
          </linearGradient>
          {/* header 中条带渐变 */}
          <linearGradient id="band-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#B88B4A' }} />
            <stop offset="100%" style={{ stopColor: '#F3DCAC' }} />
          </linearGradient>
        </defs>
        {/* 外框与内框比例与 logo.html 保持一致：inner = outer * (200/220) */}
        <rect x="10" y="10" width="80" height="80" rx={5} ry={5} fill="url(#gold-gradient)" />
        <rect x="13.64" y="13.64" width="72.73" height="72.73" rx={5} ry={5} fill="#3c4858" />

        {/* 钥匙孔形状按原始坐标缩放与平移，保持相对比例 */}
        <g transform="translate(-22.73, -22.73) scale(0.36364)">
          <path d="M 167.5 270 L 232.5 270 L 215.5 190 A 30 30 0 1 0 184.5 190 Z" fill="#FFFFFF" />
        </g>
        <text x="110" y="65" fontSize={56} fontWeight={400}>
          <tspan fill="#FFFFFF">Family</tspan>
          <tspan fill="#c5a35a" fontWeight={500}> Key</tspan>
        </text>
      </svg>
    );
  }

  return (
    <div className="app-brand">
      <span className="logo-square" aria-hidden="true" />
      <span className="app-title">Family Key</span>
    </div>
  );
}