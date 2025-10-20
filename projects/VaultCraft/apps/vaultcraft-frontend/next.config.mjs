import { config as loadDotenv } from 'dotenv'
import path from 'node:path'

// Load root .env first so NEXT_PUBLIC_* is available without per-app duplication
try {
  loadDotenv({ path: path.resolve(process.cwd(), '..', '..', '.env') })
} catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
