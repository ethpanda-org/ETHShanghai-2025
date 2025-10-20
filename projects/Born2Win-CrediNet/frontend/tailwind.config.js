/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色调
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        
        // 背景色系
        dark: {
          bg: '#0f1729',
          card: '#1a1e3d',
          border: '#2d3250',
          hover: '#252b47',
        },
        
        // 信用光谱五维配色
        spectrum: {
          keystone: '#8b5cf6',  // 基石-紫色
          ability: '#3b82f6',   // 能力-蓝色
          wealth: '#f59e0b',    // 财富-金色
          health: '#10b981',    // 健康-绿色
          behavior: '#ef4444',  // 行为-红色
        },
        
        // 渐变色
        gradient: {
          from: '#6366f1',
          via: '#8b5cf6',
          to: '#06b6d4',
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
      },
      
      animation: {
        'gradient': 'gradient 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      
      backdropBlur: {
        xs: '2px',
      },
      
      boxShadow: {
        'glow': '0 0 30px rgba(99, 102, 241, 0.5)',
        'glow-lg': '0 0 50px rgba(99, 102, 241, 0.6)',
      },
    },
  },
  plugins: [],
}

