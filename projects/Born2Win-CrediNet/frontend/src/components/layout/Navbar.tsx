import { Link, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

const Navbar = () => {
  const location = useLocation()
  const { isConnected } = useAccount()

  const navigation = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Data', path: '/data' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'Mint SBT', path: '/mint-sbt' },
    { name: 'Web3 Demo', path: '/web3-demo' },
    { name: 'Docs', path: '/docs' }
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-dark-border/50 backdrop-blur-xl bg-dark-bg/80">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold text-gradient">CrediNet</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative text-sm font-medium transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'text-cyan-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {item.name}
                {isActive(item.path) && (
                  <span className="absolute -bottom-[1.3rem] left-0 right-0 h-0.5 bg-cyan-400" />
                )}
              </Link>
            ))}
          </div>

          {/* Connect Wallet / Profile */}
          <div className="flex items-center gap-4">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
            {isConnected && (
              <Link
                to="/mint-sbt"
                className="px-6 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold transition-all duration-300 hover:scale-105"
              >
                铸造 SBT
              </Link>
            )}
            {isConnected && (
              <Link
                to="/profile"
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all duration-300 hover:scale-105"
              >
                Profile
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

