'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Spline from '@splinetool/react-spline/next';
import Navbar from '../components/Navbar';
import Footer from '../components/footer';

// 禁用静态优化，因为此页面包含 3D 场景和动态交互
export const dynamic = 'force-dynamic';

export default function HomePage() {
  // 检查是否从交易页面回退
  useEffect(() => {
    const leftTrading = sessionStorage.getItem('tradingPageLeft');
    if (leftTrading === 'true') {
      console.log('Detected back from trading page, refreshing...');
      sessionStorage.removeItem('tradingPageLeft');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black relative">
      {/* 导航栏 */}
      <Navbar />

      {/* 10月20日上午添加的酷炫特效 */}
      <Link href="/main" className="block w-full h-screen">
        <Spline
          scene="/scene2.splinecode" 
        />
      </Link>

      {/* 底部 Footer - 固定在底部 */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <Footer />
      </div>
      
    </div>
  );
}
