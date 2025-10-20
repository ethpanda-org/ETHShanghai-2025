import { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import ParticlesBackground from '../particles/ParticlesBackground'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative">
      {/* 粒子背景 */}
      <ParticlesBackground particleCount={60} />

      {/* 渐变背景 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-bg via-slate-900 to-dark-bg" />
        
        {/* 光晕效果 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-blue-500/10 via-transparent to-transparent blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-purple-500/10 via-transparent to-transparent blur-3xl" />
        </div>

        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* 导航栏 */}
      <Navbar />

      {/* 主内容区 */}
      <main className="relative pt-24 pb-12 min-h-screen">
        <div className="container mx-auto px-6">
          {children}
        </div>
      </main>

      {/* 页脚 */}
      <Footer />
    </div>
  )
}

export default Layout

