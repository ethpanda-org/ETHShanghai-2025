'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Target, Cpu, TrendingUp, Shield, Gift, Clock, DollarSign, Globe, Zap, Brain, Users, Award, ArrowRight, BarChart3, Sparkles } from 'lucide-react';

export default function DeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const slides = [
    // Slide 1: Title
    {
      id: 1,
      content: (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          <div className="relative z-10 text-center space-y-8 px-8">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-50"></div>
                <Brain className="w-32 h-32 text-blue-400 relative animate-pulse" />
              </div>
            </div>
            <h1 className="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              AetherPay
            </h1>
            <p className="text-3xl text-blue-200">AI-Powered Cross-Border Payment Revolution</p>
            <div className="flex items-center justify-center space-x-8 mt-12">
              <div className="text-center">
                <p className="text-5xl font-bold text-green-400">15s</p>
                <p className="text-lg text-gray-300">Settlement</p>
              </div>
              <div className="text-center">
                <p className="text-5xl font-bold text-yellow-400">0.6%</p>
                <p className="text-lg text-gray-300">Fee</p>
              </div>
              <div className="text-center">
                <p className="text-5xl font-bold text-pink-400">99.9%</p>
                <p className="text-lg text-gray-300">AI Accuracy</p>
              </div>
            </div>
            <p className="text-xl text-gray-300 mt-8">ETHShanghai 2025 Hackathon</p>
          </div>
        </div>
      )
    },

    // Slide 2: Problem
    {
      id: 2,
      content: (
        <div className="flex flex-col justify-center h-full bg-gradient-to-br from-red-900 to-orange-900 text-white p-16">
          <h2 className="text-5xl font-bold mb-12 flex items-center">
            <Target className="w-16 h-16 mr-4 text-red-400" />
            The $206.5B Problem
          </h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-black/30 p-6 rounded-xl backdrop-blur">
                <h3 className="text-2xl font-bold text-red-400 mb-3">Traditional Banking (SWIFT)</h3>
                <ul className="space-y-2 text-lg">
                  <li className="flex items-center"><Clock className="w-5 h-5 mr-2" /> 3-5 days settlement</li>
                  <li className="flex items-center"><DollarSign className="w-5 h-5 mr-2" /> 11% fees + FX spread</li>
                  <li className="flex items-center"><Shield className="w-5 h-5 mr-2" /> Opaque process</li>
                </ul>
              </div>
              <div className="bg-black/30 p-6 rounded-xl backdrop-blur">
                <h3 className="text-2xl font-bold text-orange-400 mb-3">Existing Crypto Solutions</h3>
                <ul className="space-y-2 text-lg">
                  <li className="flex items-center">Circle: USDC only</li>
                  <li className="flex items-center">Chainlink: $0.5-2 per update</li>
                  <li className="flex items-center">DEXs: 0.3-1% slippage</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="bg-black/40 p-8 rounded-2xl text-center backdrop-blur">
                <p className="text-6xl font-bold text-yellow-400 mb-4">14%</p>
                <p className="text-2xl">Average Loss</p>
                <p className="text-xl text-gray-300 mt-2">Per SME Transaction</p>
                <p className="text-4xl font-bold text-red-400 mt-6">$40B+</p>
                <p className="text-lg text-gray-300">Annual Loss</p>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 3: Solution
    {
      id: 3,
      content: (
        <div className="flex flex-col justify-center h-full bg-gradient-to-br from-green-900 to-teal-900 text-white p-16">
          <h2 className="text-5xl font-bold mb-12 flex items-center">
            <Sparkles className="w-16 h-16 mr-4 text-green-400" />
            Our Solution: AI + Blockchain
          </h2>
          <div className="grid grid-cols-3 gap-8">
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur hover:bg-white/20 transition">
              <Brain className="w-16 h-16 text-blue-400 mb-4" />
              <h3 className="text-2xl font-bold mb-3">AI Oracle</h3>
              <ul className="space-y-2">
                <li>500-tree LightGBM</li>
                <li>99.9% accuracy</li>
                <li>5-min prediction</li>
                <li>Zero slippage</li>
              </ul>
            </div>
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur hover:bg-white/20 transition">
              <Zap className="w-16 h-16 text-yellow-400 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Instant Settlement</h3>
              <ul className="space-y-2">
                <li>15 seconds</li>
                <li>0.6% fixed fee</li>
                <li>Any ERC-20</li>
                <li>No KYC needed</li>
              </ul>
            </div>
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur hover:bg-white/20 transition">
              <Gift className="w-16 h-16 text-pink-400 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Social Impact</h3>
              <ul className="space-y-2">
                <li>5% to public goods</li>
                <li>On-chain transparent</li>
                <li>$1,500+ donated</li>
                <li>Industry first</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-400">
              Making Payments Instant, Affordable, Meaningful
            </p>
          </div>
        </div>
      )
    },

    // Slide 4: How It Works
    {
      id: 4,
      content: (
        <div className="flex flex-col justify-center h-full bg-gradient-to-br from-purple-900 to-pink-900 text-white p-16">
          <h2 className="text-5xl font-bold mb-12 flex items-center">
            <Cpu className="w-16 h-16 mr-4 text-purple-400" />
            How AetherPay Works
          </h2>
          <div className="space-y-8">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500/20 p-6 rounded-xl flex-1">
                <p className="text-xl font-bold mb-2">1. Data Aggregation</p>
                <p>6 sources: Binance, CoinGecko, Uniswap, 1inch, OKX</p>
              </div>
              <ArrowRight className="w-8 h-8" />
              <div className="bg-purple-500/20 p-6 rounded-xl flex-1">
                <p className="text-xl font-bold mb-2">2. AI Prediction</p>
                <p>LightGBM processes & predicts 5-min ahead</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-pink-500/20 p-6 rounded-xl flex-1">
                <p className="text-xl font-bold mb-2">3. Oracle Consensus</p>
                <p>3/5 nodes verify & sign price data</p>
              </div>
              <ArrowRight className="w-8 h-8" />
              <div className="bg-green-500/20 p-6 rounded-xl flex-1">
                <p className="text-xl font-bold mb-2">4. Smart Contract</p>
                <p>Execute swap with zero slippage</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500/20 to-green-500/20 p-8 rounded-xl mt-8">
              <p className="text-2xl font-bold text-center">Result: 15-second settlement at 0.6% fee</p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 5: Live Demo
    {
      id: 5,
      content: (
        <div className="flex flex-col justify-center h-full bg-gradient-to-br from-blue-900 to-cyan-900 text-white p-16">
          <h2 className="text-5xl font-bold mb-12 flex items-center">
            <Play className="w-16 h-16 mr-4 text-blue-400" />
            Live Demo
          </h2>
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-cyan-400">Features Demonstrated</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full mr-3"></div>
                  <p className="text-xl">AI Oracle real-time prediction</p>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full mr-3"></div>
                  <p className="text-xl">15-second payment flow</p>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full mr-3"></div>
                  <p className="text-xl">Partial payment for B2B</p>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full mr-3"></div>
                  <p className="text-xl">Public goods donation tracking</p>
                </div>
              </div>
            </div>
            <div className="bg-black/30 p-8 rounded-xl backdrop-blur">
              <h3 className="text-2xl font-bold mb-6">Test on Optimism Sepolia</h3>
              <div className="space-y-3 font-mono text-sm">
                <p className="text-green-400">Oracle: 0xb91560a3...42aE</p>
                <p className="text-blue-400">Gateway: 0xeF1BA1e8...9C67</p>
                <p className="text-purple-400">FXPool: 0x635A84BD...4aE5</p>
                <p className="text-pink-400">PublicFund: 0xA1df5B09...c486</p>
              </div>
              <button className="mt-6 bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 rounded-lg font-bold hover:from-blue-600 hover:to-purple-600 transition">
                Try Demo Now →
              </button>
            </div>
          </div>
        </div>
      )
    },

    // Slide 6: Market & Competition
    {
      id: 6,
      content: (
        <div className="flex flex-col justify-center h-full bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-16">
          <h2 className="text-5xl font-bold mb-12 flex items-center">
            <BarChart3 className="w-16 h-16 mr-4 text-indigo-400" />
            Market Opportunity
          </h2>
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur">
                <p className="text-5xl font-bold text-green-400">$206.5B</p>
                <p className="text-xl">2024 Market Size</p>
              </div>
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur">
                <p className="text-5xl font-bold text-blue-400">$414.6B</p>
                <p className="text-xl">2034 Projection</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">Competitive Advantage</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-2">Feature</th>
                    <th>AetherPay</th>
                    <th>Circle</th>
                    <th>Wise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-700">
                    <td className="py-2">Settlement</td>
                    <td className="text-center text-green-400">15s</td>
                    <td className="text-center">1hr</td>
                    <td className="text-center">1-3d</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-2">Fees</td>
                    <td className="text-center text-green-400">0.6%</td>
                    <td className="text-center">0.1%+gas</td>
                    <td className="text-center">2%+FX</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-2">AI Prediction</td>
                    <td className="text-center text-green-400">✓</td>
                    <td className="text-center text-red-400">✗</td>
                    <td className="text-center text-red-400">✗</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-2">Partial Pay</td>
                    <td className="text-center text-green-400">✓</td>
                    <td className="text-center text-red-400">✗</td>
                    <td className="text-center text-red-400">✗</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    },

    // Slide 7: Traction & Roadmap
    {
      id: 7,
      content: (
        <div className="flex flex-col justify-center h-full bg-gradient-to-br from-green-900 to-emerald-900 text-white p-16">
          <h2 className="text-5xl font-bold mb-12 flex items-center">
            <TrendingUp className="w-16 h-16 mr-4 text-green-400" />
            Traction & Roadmap
          </h2>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <h3 className="text-3xl font-bold text-yellow-400 mb-6">Testnet Achievement</h3>
              <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-lg">
                  <p className="text-2xl font-bold">$2.5M+</p>
                  <p className="text-gray-300">Volume Processed</p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <p className="text-2xl font-bold">$1,500+</p>
                  <p className="text-gray-300">Donated to Public Goods</p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <p className="text-2xl font-bold">99.8%</p>
                  <p className="text-gray-300">Success Rate</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-blue-400 mb-6">2025 Roadmap</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <p><span className="font-bold">Q1:</span> ZK Privacy Layer</p>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <p><span className="font-bold">Q2:</span> Mainnet Launch</p>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <p><span className="font-bold">Q3:</span> Fiat On/Off Ramp</p>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
                  <p><span className="font-bold">Q4:</span> 1M Users Target</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg">
                <p className="text-xl font-bold">$100M Monthly Volume Goal</p>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 8: Team & Contact
    {
      id: 8,
      content: (
        <div className="flex flex-col justify-center h-full bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 text-white p-16">
          <h2 className="text-5xl font-bold mb-12 flex items-center">
            <Award className="w-16 h-16 mr-4 text-purple-400" />
            Why AetherPay Wins
          </h2>
          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="bg-white/10 p-8 rounded-xl backdrop-blur">
                <Globe className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                <p className="text-xl font-bold">Real Value</p>
                <p className="text-sm text-gray-300 mt-2">Solving $40B annual loss</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/10 p-8 rounded-xl backdrop-blur">
                <Brain className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <p className="text-xl font-bold">Tech Innovation</p>
                <p className="text-sm text-gray-300 mt-2">World's first AI payment oracle</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/10 p-8 rounded-xl backdrop-blur">
                <Gift className="w-16 h-16 mx-auto mb-4 text-pink-400" />
                <p className="text-xl font-bold">Social Impact</p>
                <p className="text-sm text-gray-300 mt-2">Built-in public goods funding</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-8 rounded-xl text-center">
            <p className="text-3xl font-bold mb-4">Join the Payment Revolution</p>
            <div className="flex justify-center space-x-8 text-lg">
              <p>GitHub: @ybc112</p>
              <p>Project: /projects/AetherPay</p>
            </div>
            <p className="text-2xl font-bold mt-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Making Payments Instant • Affordable • Meaningful
            </p>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    if (isAutoPlay) {
      const timer = setTimeout(() => {
        if (currentSlide < slides.length - 1) {
          setCurrentSlide(currentSlide + 1);
        } else {
          setIsAutoPlay(false);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, isAutoPlay, slides.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' && currentSlide < slides.length - 1) {
        setCurrentSlide(currentSlide + 1);
      } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsAutoPlay(!isAutoPlay);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, slides.length, isAutoPlay]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black relative">
      {/* Main Slide */}
      <div className="h-full w-full">
        {slides[currentSlide].content}
      </div>

      {/* Navigation */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-50">
        <button
          onClick={() => currentSlide > 0 && setCurrentSlide(currentSlide - 1)}
          className="p-3 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition disabled:opacity-50"
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/40'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => currentSlide < slides.length - 1 && setCurrentSlide(currentSlide + 1)}
          className="p-3 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition disabled:opacity-50"
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <button
          onClick={() => setIsAutoPlay(!isAutoPlay)}
          className={`p-3 backdrop-blur rounded-full text-white transition ml-4 ${
            isAutoPlay ? 'bg-green-500/30 hover:bg-green-500/40' : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          <Play className="w-6 h-6" />
        </button>
      </div>

      {/* Slide Counter */}
      <div className="absolute top-8 right-8 text-white/60 text-lg z-50">
        {currentSlide + 1} / {slides.length}
      </div>

      {/* Instructions */}
      <div className="absolute top-8 left-8 text-white/40 text-sm z-50">
        <p>Use ← → arrows or click to navigate</p>
        <p>Press Space to auto-play</p>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
}