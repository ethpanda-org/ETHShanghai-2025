import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/files/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/zip',
          },
          {
            key: "Cache-Control",
            value: "public, max-age=86400, immutable",
          }
        ],
      }
    ];
  },
};

export default nextConfig;
