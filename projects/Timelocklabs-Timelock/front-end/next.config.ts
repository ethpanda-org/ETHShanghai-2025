import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
	optimizeFonts: false,
	// 性能优化配置
	compiler: {
		// 移除console.log (生产环境)
		removeConsole: process.env.NODE_ENV === 'production',
	},
	// 实验性功能
	experimental: {
		// 优化包导入
		optimizePackageImports: [
			'@radix-ui/react-avatar',
			'@radix-ui/react-dialog',
			'@radix-ui/react-dropdown-menu',
			'@radix-ui/react-popover',
			'@radix-ui/react-select',
			'@radix-ui/react-tabs',
			'@radix-ui/react-tooltip',
			'@heroicons/react',
			'lucide-react'
		],
	},
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: 'https://test.timelock.live/api/:path*',
			},
		];
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https' as const,
				hostname: 'raw.githubusercontent.com',
			},
			{
				protocol: 'https' as const,
				hostname: 'cryptologos.cc',
			},
			{
				protocol: 'https' as const,
				hostname: 'avatars.githubusercontent.com',
			},
			{
				protocol: 'https' as const,
				hostname: 'pbs.twimg.com',
			},
			{
				protocol: 'https' as const,
				hostname: 'logos.covalenthq.com',
			},
			{
				protocol: 'https' as const,
				hostname: 'www.datocms-assets.com',
			},
			{
				protocol: 'https' as const,
				hostname: 'cdn.moralis.io',
			},
		],
	},
	eslint: {
		ignoreDuringBuilds: true,
	  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
