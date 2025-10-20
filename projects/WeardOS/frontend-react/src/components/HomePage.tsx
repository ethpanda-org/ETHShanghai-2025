import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Button } from 'antd';
// 移除未使用的图标导入
import './HomePage.scss';

// 类型定义
interface SlideData {
  k1: string;
  t1: string;
  k2: string;
  t2: string;
  k3: string;
  t3: string;
}

interface FeatureData {
  icon: string;
  title: string;
  description: string;
}

// 懒加载组件
const LazyFeatureCard = lazy(() => import('./FeatureCard'));
const LazyCodeBlock = lazy(() => import('./CodeBlock'));

const HomePage: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [isVisible, setIsVisible] = useState({
    hero: false,
    infra: false,
    features: false,
    code: false
  });
  
  const intervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const slides: SlideData[] = [
    {
      k1: '99.9%',
      t1: '系统可用性',
      k2: '< 100ms',
      t2: '响应时间',
      k3: '1M+',
      t3: '用户信赖'
    },
    {
      k1: '1000+',
      t1: '智能合约模板',
      k2: '50+',
      t2: '区块链网络',
      k3: '10K+',
      t3: '开发者社区'
    },
    {
      k1: '24/7',
      t1: 'AI助手服务',
      k2: '100%',
      t2: '代码安全检测',
      k3: '0',
      t3: '安全漏洞'
    }
  ];

  const features: FeatureData[] = [
    {
      icon: 'smart-contract',
      title: 'AI智能合约生成',
      description: '基于自然语言描述，自动生成安全、高效的智能合约代码。'
    },
    {
      icon: 'blockchain-ai',
      title: '链上AI',
      description: '直接在区块链上运行AI模型，确保推理过程透明可验证。'
    },
    {
      icon: 'cross-chain',
      title: '跨链AI服务',
      description: '统一的AI服务接口，支持多个区块链网络的无缝集成。'
    }
  ];

  // 轮播控制 - 使用useCallback优化
  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 4000);
  }, [slides.length]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const go = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  // 视频事件处理 - 优化错误处理
  const onVideoError = useCallback(() => {
    console.warn('Video failed to load, using fallback background');
    setVideoError(true);
  }, []);

  const onVideoCanPlay = useCallback(() => {
    setVideoError(false);
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const section = target.dataset.section;
            if (section) {
              setIsVisible(prev => ({ ...prev, [section]: true }));
            }
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px 0px'
      }
    );

    // 观察所有section
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(section => {
      observerRef.current?.observe(section);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);



  // 视频预加载和轮播初始化
  useEffect(() => {
    // 预加载视频
    if (videoRef.current) {
      videoRef.current.load();
    }

    // 启动轮播
    start();

    // 清理函数
    return () => {
      stop();
      observerRef.current?.disconnect();
    };
  }, [start, stop]);

  // 生成粒子动画 - 优化性能
  const generateParticles = useCallback(() => {
    return Array.from({ length: 8 }, (_, i) => (
      <div
        key={i}
        className="particle"
        style={{
          '--delay': `${Math.random() * 8}s`,
          '--duration': `${Math.random() * 12 + 15}s`,
          '--x': `${Math.random() * 100}%`,
          '--y': `${Math.random() * 100}%`,
          '--size': `${Math.random() * 3 + 2}px`
        } as React.CSSProperties}
      />
    ));
  }, []);

  return (
    <div className="lp">
      {/* Hero Section */}
      <section className="hero edge" data-section="hero">
        <div className="hero-video-bg">
          <div className="gradient-bg"></div>
          
          {videoError && (
            <div className="video-fallback">
              <div className="fallback-content">
                <div className="fallback-icon">🌟</div>
                <div className="fallback-text">Weard OS</div>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            className="bg-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={onVideoError}
            onCanPlay={onVideoCanPlay}
            poster="/api/placeholder/1920/1080"
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
            <source src="/videos/hero-bg.webm" type="video/webm" />
          </video>
          <div className="video-overlay"></div>
        </div>

        <div className="hero-content">
          <div className="particles">
            {generateParticles()}
          </div>
          
          <div className="hero-text">
              <h1 className="hero-title">
                <div className="title-main">Weard OS</div>
                <div className="title-sub">智能风险防护系统</div>
              </h1>
            <p className="hero-subtitle">
              AI驱动的以太坊生态智能风险防护，保护您的数字资产安全
            </p>
            
            <div className="hero-actions">
              <a href="#features" className="start-building-btn btn-enhanced focus-enhanced">
                <div>🚀</div>
                开始构建
              </a>
              <a href="#code" className="get-wallet-btn btn-enhanced focus-enhanced">
                <div>💼</div>
                获取钱包
              </a>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">检测准确率</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">实时监控</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">1000+</div>
              <div className="stat-label">保护的合约</div>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="infra edge reveal" data-section="infra" onMouseEnter={stop} onMouseLeave={start}>
        <h2>AI驱动的智能化基础设施</h2>
        <p className="sub">结合人工智能与区块链技术，提供高效、安全、智能的开发体验</p>
        <div className="carousel">
          <button className="nav l" onClick={next} aria-label="下一张">‹</button>
          <div className="track" style={{ transform: `translateX(${-current * 100}%)` }}>
            {slides.map((slide, i) => {
              const slideKey = `slide-${i}`;
              return (
                <div
                  key={slideKey}
                  className={`slide ${i === current ? 'active' : ''}`}
                >
                <div className="card">
                  <div className="chart">
                    <svg className="art" viewBox="0 0 600 220" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id={`g${i + 1}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#00d4ff">
                            <animate attributeName="stop-color" values="#00d4ff;#21d4fd;#00d4ff" dur="12s" repeatCount="indefinite"/>
                          </stop>
                          <stop offset="100%" stopColor="#9c26ff">
                            <animate attributeName="stop-color" values="#9c26ff;#ff3d9a;#9c26ff" dur="10s" repeatCount="indefinite"/>
                          </stop>
                        </linearGradient>
                        <radialGradient id={`rg${i + 1}`} cx="30%" cy="30%" r="50%">
                          <stop offset="0%" stopColor="#21d4fd" stopOpacity=".7">
                            <animate attributeName="stop-opacity" values=".6;.8;.6" dur="8s" repeatCount="indefinite"/>
                          </stop>
                          <stop offset="100%" stopColor="#11162a" stopOpacity="0"/>
                        </radialGradient>
                        <filter id={`blur${i + 1}`}><feGaussianBlur stdDeviation="15"/></filter>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#g${i + 1})`} opacity=".3"/>
                      <circle cx="150" cy="80" r="100" fill={`url(#rg${i + 1})`} filter={`url(#blur${i + 1})`}>
                        <animate attributeName="cx" values="150;450;150" dur="12s" repeatCount="indefinite"/>
                        <animate attributeName="cy" values="80;140;80" dur="10s" repeatCount="indefinite"/>
                      </circle>
                      <circle cx="450" cy="160" r="120" fill="#1b6dff" opacity=".2">
                        <animate attributeName="cy" values="160;100;160" dur="10s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values=".2;.35;.2" dur="8s" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                  </div>
                  <div className="m">
                    <div className="k">{slide.k1}</div>
                    <div className="t">{slide.t1}</div>
                  </div>
                  <div className="m">
                    <div className="k">{slide.k2}</div>
                    <div className="t">{slide.t2}</div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          <button className="nav r" onClick={prev} aria-label="上一张">›</button>
          <div className="dots">
            {slides.map((_, i) => {
              const dotKey = `dot-${i}`;
              return (
              <button
                key={dotKey}
                className={i === current ? 'on floating' : ''}
                onClick={() => go(i)}
              ></button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features edge reveal" data-section="features">
        <h2>核心能力</h2>
        <div className="grid">
          <Suspense fallback={<div className="loading-placeholder">加载中...</div>}>
            {isVisible.features && features.map((feature, i) => (
              <LazyFeatureCard key={`feature-${feature.title}-${i}`} feature={{...feature, id: i}} index={i} />
            ))}
          </Suspense>
        </div>
      </section>

      {/* Code Section */}
      <section className="code edge reveal" data-section="code">
        <h2>AI驱动的智能合约开发</h2>
        <p className="sub">使用自然语言描述需求，AI自动生成优化的智能合约代码。</p>
        <Suspense fallback={<div className="loading-placeholder">加载代码示例...</div>}>
          {isVisible.code && <LazyCodeBlock code={`// AI生成的智能合约示例
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract AIGeneratedContract {
    mapping(address => uint256) public balances;
    address public owner;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }
    
    function getBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
}`} language="solidity" />}
        </Suspense>
        <div className="ctas">
          <Button type="primary" size="large" className="p">开始构建</Button>
        </div>
      </section>

      {/* Support Section */}
      <section className="support edge reveal">
        <h2>开发者支持</h2>
        <p className="sub">
          为开发者提供全方位的技术支持和资源，助力您快速构建创新应用
        </p>
        
        <div className="sup">
          <div className="support-card">
            <div className="card-icon">📚</div>
            <h3 className="card-title">开发文档</h3>
            <p className="card-description">
              完整的API文档、开发指南和最佳实践，帮助您快速上手
            </p>
            <div className="mini">
              <div className="mc"></div>
              <div className="mc"></div>
              <div className="mc"></div>
            </div>
            <ul className="links">
              <li><a href="#"><div className="link-icon">📖</div>API 文档</a></li>
              <li><a href="#"><div className="link-icon">🎯</div>快速开始</a></li>
              <li><a href="#"><div className="link-icon">💡</div>示例代码</a></li>
            </ul>
          </div>

          <div className="support-card">
            <div className="card-icon">🛠️</div>
            <h3 className="card-title">开发工具</h3>
            <p className="card-description">
              强大的开发工具链，提升开发效率和代码质量
            </p>
            <div className="mini">
              <div className="mc"></div>
              <div className="mc"></div>
              <div className="mc"></div>
            </div>
            <ul className="links">
              <li><a href="#"><div className="link-icon">⚡</div>CLI 工具</a></li>
              <li><a href="#"><div className="link-icon">🔧</div>SDK 下载</a></li>
              <li><a href="#"><div className="link-icon">🧪</div>测试工具</a></li>
            </ul>
          </div>

          <div className="support-card">
            <div className="card-icon">👥</div>
            <h3 className="card-title">社区支持</h3>
            <p className="card-description">
              活跃的开发者社区，技术交流和问题解答
            </p>
            <div className="mini">
              <div className="mc"></div>
              <div className="mc"></div>
              <div className="mc"></div>
            </div>
            <ul className="links">
              <li><a href="#"><div className="link-icon">💬</div>Discord 社区</a></li>
              <li><a href="#"><div className="link-icon">📧</div>技术支持</a></li>
              <li><a href="#"><div className="link-icon">🎪</div>开发者论坛</a></li>
            </ul>
          </div>
        </div>

        <div className="developer-cta">
          <h3>准备开始构建？</h3>
          <p>加入我们的开发者社区，获取最新资源和技术支持</p>
          <div className="cta-buttons">
            <a href="#" className="cta-btn">
              <div>🚀</div>
              开始开发
            </a>
            <a href="#" className="cta-btn secondary">
              <div>📋</div>
              查看文档
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#21d4fd"/>
                    <stop offset="100%" stopColor="#1b6dff"/>
                  </linearGradient>
                </defs>
                <path d="M20 4C11.2 4 4 11.2 4 20s7.2 16 16 16 16-7.2 16-16S28.8 4 20 4zm0 28c-6.6 0-12-5.4-12-12S13.4 8 20 8s12 5.4 12 12-5.4 12-12 12z" fill="url(#logoGrad)"/>
                <circle cx="20" cy="20" r="6" fill="url(#logoGrad)" opacity="0.8"/>
              </svg>
            </div>
            <div className="logo-text">Weard</div>
          </div>
          
          <div className="footer-links">
            <div className="link-group">
              <h4>Weard OS</h4>
              <ul>
              </ul>
            </div>
            
            <div className="link-group">
              <h4>Weard OS</h4>
              <ul>
              </ul>
            </div>
            
            <div className="link-group">
              <h4>Weard OS</h4>
              <ul>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="social-links"></div>
          <div className="copyright">
            <p>© 2025 COPYRIGHT Weard FOUNDATION. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;