import {fileURLToPath} from "url";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
      react(),
      tailwindcss()
  ],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),  // 将 '@' 映射到 src 目录
        },
    },
})
