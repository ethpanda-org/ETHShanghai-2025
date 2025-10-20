import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    },
    proxy: {
      // 代理API请求
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // 代理Socket.IO请求
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true, // 启用WebSocket代理
        rewrite: (path) => path
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Use the modern API to avoid legacy JS API deprecation warnings
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api']
      }
    }
  }
})