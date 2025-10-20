import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">AetherPay</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/orders" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Orders Market
              </Link>
              <Link href="/pool" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                FX Pool
              </Link>
              <Link href="/analytics" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Analytics
              </Link>
              <Link href="/public-goods" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Public Goods
              </Link>
              <Link href="/user" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                My Impact
              </Link>
              <Link
                href="/dashboard"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-20 pt-8">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
              AI-Powered Cross-Border Payments
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 text-slate-900">
            AetherPay
          </h1>
          <p className="text-2xl text-slate-700 mb-4 font-medium">
            Reduce Payment Fees from 3% to 0.2%-0.4%
          </p>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Enterprise-grade cross-border payment infrastructure powered by AI exchange rate prediction
            and multi-oracle consensus. Built on Optimism L2 for instant settlement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-4 rounded-xl transition-all text-lg shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Start Building
            </Link>
            <Link
              href="#how-it-works"
              className="bg-white hover:bg-slate-50 text-slate-900 font-semibold px-8 py-4 rounded-xl transition-all text-lg shadow-lg border-2 border-slate-200 inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Demo
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-20 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="text-5xl font-bold text-emerald-600 mb-2">0.2-0.4%</div>
            <div className="text-lg font-semibold text-slate-900 mb-1">Platform Fee</div>
            <div className="text-sm text-slate-500">Save 85-90% vs traditional 3% processors</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-rose-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="text-5xl font-bold text-rose-600 mb-2">5%</div>
            <div className="text-lg font-semibold text-slate-900 mb-1">Auto Donation</div>
            <div className="text-sm text-slate-500">5% of fees support Ethereum public goods</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-5xl font-bold text-blue-600 mb-2">T+0</div>
            <div className="text-lg font-semibold text-slate-900 mb-1">Settlement</div>
            <div className="text-sm text-slate-500">Instant settlement on Optimism L2</div>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Core Features</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Enterprise-grade payment infrastructure with AI-powered optimization
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Exchange Rates</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                LightGBM model with 97.4% R² accuracy. Multi-oracle consensus mechanism ensures reliability and prevents manipulation.
              </p>
              <div className="text-sm text-purple-600 font-semibold">30-second predictions • 99.9% uptime</div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">FX Liquidity Pool</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Decentralized exchange for stablecoins and crypto. Provide liquidity to earn fees or swap tokens with MEV protection.
              </p>
              <div className="text-sm text-emerald-600 font-semibold">5-18% APY • Instant swaps</div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Public Goods Engine</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                5% of platform fees automatically support Ethereum core development, public goods, and open source projects.
              </p>
              <div className="text-sm text-rose-600 font-semibold">100% transparent • On-chain verified</div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mb-20 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-12 md:p-16 text-white">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Four simple steps to start accepting cross-border payments
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg font-bold mb-2">Connect Wallet</h3>
              <p className="text-slate-300 text-sm">
                Connect your Web3 wallet (MetaMask, WalletConnect, Coinbase Wallet)
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg font-bold mb-2">Register Business</h3>
              <p className="text-slate-300 text-sm">
                Quick one-click registration with your business name
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg font-bold mb-2">Create Orders</h3>
              <p className="text-slate-300 text-sm">
                Generate payment links with custom amounts and currencies
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h3 className="text-lg font-bold mb-2">Receive Payments</h3>
              <p className="text-slate-300 text-sm">
                Instant settlement with automatic currency conversion
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-8 py-3 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Get Started Now
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Built on Best-in-Class Infrastructure</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Enterprise-grade security and performance
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 text-center hover:shadow-lg transition-shadow">
              <div className="text-2xl font-bold text-slate-900 mb-2">Optimism</div>
              <div className="text-sm text-slate-600 mb-3">Layer 2 Network</div>
              <div className="text-xs text-slate-500">Fast & low-cost transactions</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 text-center hover:shadow-lg transition-shadow">
              <div className="text-2xl font-bold text-slate-900 mb-2">LightGBM</div>
              <div className="text-sm text-slate-600 mb-3">AI Model</div>
              <div className="text-xs text-slate-500">97.4% prediction accuracy</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 text-center hover:shadow-lg transition-shadow">
              <div className="text-2xl font-bold text-slate-900 mb-2">Multi-Oracle</div>
              <div className="text-sm text-slate-600 mb-3">Price Consensus</div>
              <div className="text-xs text-slate-500">Decentralized & reliable</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 text-center hover:shadow-lg transition-shadow">
              <div className="text-2xl font-bold text-slate-900 mb-2">FXRouter</div>
              <div className="text-sm text-slate-600 mb-3">Smart Routing</div>
              <div className="text-xs text-slate-500">Optimal execution</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Reduce Your Payment Fees?</h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of merchants saving 85-90% on cross-border payment fees while supporting Ethereum public goods
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-10 py-4 rounded-xl transition-colors text-lg shadow-lg inline-flex items-center justify-center gap-2"
            >
              Start Free Trial
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/public-goods"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-10 py-4 rounded-xl transition-colors text-lg inline-flex items-center justify-center gap-2"
            >
              See Our Impact
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900">AetherPay</span>
              </div>
              <p className="text-sm text-slate-600">
                AI-powered cross-border payment infrastructure for the next generation of commerce.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="/dashboard" className="hover:text-slate-900">Merchant Dashboard</Link></li>
                <li><Link href="#features" className="hover:text-slate-900">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-slate-900">How It Works</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="/public-goods" className="hover:text-slate-900">Public Goods</Link></li>
                <li><a href="#" className="hover:text-slate-900">Documentation</a></li>
                <li><a href="#" className="hover:text-slate-900">API Reference</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-4">Community</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">GitHub</a></li>
                <li><a href="#" className="hover:text-slate-900">Twitter</a></li>
                <li><a href="#" className="hover:text-slate-900">Discord</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
            <p>© 2025 AetherPay. Built with ❤️ for Ethereum • Powered by Optimism, LightGBM AI, Multi-Oracle Consensus</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
