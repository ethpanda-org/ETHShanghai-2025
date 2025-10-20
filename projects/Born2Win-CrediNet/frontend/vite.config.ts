import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    open: true,
    proxy: {
      // 将以 /api 开头的请求代理到 Rust 后端，避免浏览器跨域
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        // 如果后端没有额外的前缀，保持路径不变
        rewrite: (path) => path,
      },
    },
  },
})

