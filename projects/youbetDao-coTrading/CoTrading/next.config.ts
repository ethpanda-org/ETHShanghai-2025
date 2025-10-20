import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  webpack: (config) => {
    // Ensure axios client generated code that imports 'form-data' resolves to a browser-safe shim
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'form-data': path.resolve(__dirname, 'shims/form-data.ts'),
    } as any;
    return config;
  },
};

export default nextConfig;
