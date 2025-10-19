import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize production build
  reactStrictMode: true,

  // Disable source maps in production to reduce bundle size
  productionBrowserSourceMaps: false,

  webpack: (config, { dev, isServer }) => {
    // Ignore optional dependencies that are not needed in browser environment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };

    // Suppress warnings for optional peer dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
      { module: /node_modules\/pino/ },
      { module: /node_modules\/@walletconnect/ },
      { module: /node_modules\/lit/ },
    ];

    return config;
  },

  // Optimize experimental features
  experimental: {
    optimizePackageImports: ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
  },
};

export default nextConfig;
