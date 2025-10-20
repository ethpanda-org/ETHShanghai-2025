import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // 只保留 ethers 独立打包（已移除 Safe SDK）
          'ethers': ['ethers'],
        },
      },
    },
    // 恢复代码压缩
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: ['ethers'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
});
