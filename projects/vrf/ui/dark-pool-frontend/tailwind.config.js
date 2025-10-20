/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#030712',
        }
      },
      animation: {
        'blur-pulse': 'blur 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        blur: {
          '0%, 100%': { filter: 'blur(8px)' },
          '50%': { filter: 'blur(12px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 10px #10b981' },
          'to': { boxShadow: '0 0 20px #10b981, 0 0 30px #10b981' },
        },
      },
    },
  },
  plugins: [],
}