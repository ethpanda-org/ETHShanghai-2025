"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ChartBarIcon, CheckCircleIcon, ShieldCheckIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      {/* Advanced Background with Perspective Grid */}
      <div className="fixed inset-0 -z-10 bg-slate-950 overflow-hidden">
        {/* Base Gradient Layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950" />

        {/* Perspective Grid */}
        <div className="absolute inset-0" style={{ perspective: "1000px" }}>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(56, 189, 248, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(56, 189, 248, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
              transform: "rotateX(60deg) scale(2)",
              transformOrigin: "center center",
            }}
          />
        </div>

        {/* Radial Gradient Mask */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-slate-950/50 to-slate-950" />

        {/* Multiple Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-3xl animate-pulse-slower" />
        <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />

        {/* Horizontal Scan Lines */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "linear-gradient(to bottom, transparent 50%, rgba(56, 189, 248, 0.3) 50%)",
            backgroundSize: "100% 4px",
          }}
        />

        {/* Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />

        {/* Bottom Glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-blue-500/5 via-transparent to-transparent" />
      </div>

      <div className="relative min-h-screen">
        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-20 pb-16">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-sky-500/10 border border-blue-500/20">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-blue-400 text-sm font-medium">Zero-Knowledge Protocol</span>
            </div>
          </div>

          {/* Main Title */}
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 bg-clip-text text-transparent">
                ZK-Flex
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-slate-300 mb-4 font-light">
              Privacy-Preserving Wealth Verification
            </p>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              For everyone, everywhere. Prove your assets without revealing your identity.
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-12 mb-16 flex-wrap">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">32</div>
              <div className="text-slate-500 text-sm">Wallet Pool Size</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">~1.88M</div>
              <div className="text-slate-500 text-sm">ZK Constraints</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">~60s</div>
              <div className="text-slate-500 text-sm">Proof Time</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="container mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Connected Wallet */}
            <div className="lg:col-span-3">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-slate-700 font-semibold text-sm">CONNECTED</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Your Wallet</p>
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <Address address={connectedAddress} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Network</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">ETH</span>
                      </div>
                      <span className="text-slate-700 font-medium">Ethereum</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 shadow-xl mt-6">
                <h3 className="text-slate-700 font-semibold mb-4">Privacy Level</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Anonymity Set</span>
                      <span className="text-slate-900 font-semibold">32</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-blue-500 to-sky-500 rounded-full" />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <div className="text-2xl font-bold text-slate-900">3.125%</div>
                    <div className="text-xs text-slate-500">Attack Success Rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center - Main Action Cards */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Bob Card */}
                <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-3xl p-8 shadow-xl border border-blue-100">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
                    <UserGroupIcon className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Prover Mode</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">Create wallet pools and generate proofs</p>

                  <div className="space-y-2 mb-8">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                      <span>32-address pool</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                      <span>Browser-side generation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                      <span>60s proof time</span>
                    </div>
                  </div>

                  <Link
                    href="/zk-flex/bob"
                    className="block w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-center font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
                  >
                    Generate Proof →
                  </Link>
                </div>

                {/* Alice Card */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-8 shadow-xl border border-violet-100">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl mb-6 shadow-lg shadow-violet-500/30">
                    <ShieldCheckIcon className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Verifier Mode</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">Verify proofs on-chain securely</p>

                  <div className="space-y-2 mb-8">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircleIcon className="h-4 w-4 text-violet-500" />
                      <span>On-chain verification</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircleIcon className="h-4 w-4 text-violet-500" />
                      <span>FREE (view function)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircleIcon className="h-4 w-4 text-violet-500" />
                      <span>Instant validation</span>
                    </div>
                  </div>

                  <Link
                    href="/zk-flex/alice"
                    className="block w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-center font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50"
                  >
                    Verify Proof →
                  </Link>
                </div>
              </div>

              {/* How it Works */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xl font-bold text-slate-900 mb-6">How It Works</h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <div className="text-center flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-lg">1</span>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">Create Wallet Pool</p>
                  </div>

                  {/* Arrow 1: Blue to Purple Gradient */}
                  <div className="flex-shrink-0 hidden md:block -mt-9">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <path
                        d="M5 12h14m0 0l-6-6m6 6l-6 6"
                        stroke="url(#gradient1)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-shrink-0 md:hidden">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="gradient1-mobile" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <path
                        d="M12 5v14m0 0l6-6m-6 6l-6-6"
                        stroke="url(#gradient1-mobile)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="text-center flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-lg">2</span>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">Generate ZK Proof</p>
                  </div>

                  {/* Arrow 2: Purple to Green Gradient */}
                  <div className="flex-shrink-0 hidden md:block -mt-9">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <path
                        d="M5 12h14m0 0l-6-6m6 6l-6 6"
                        stroke="url(#gradient2)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-shrink-0 md:hidden">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="gradient2-mobile" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <path
                        d="M12 5v14m0 0l6-6m-6 6l-6-6"
                        stroke="url(#gradient2-mobile)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="text-center flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-lg">3</span>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">Verify On-Chain</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Tech Stack */}
            <div className="lg:col-span-3">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <ChartBarIcon className="h-5 w-5 text-slate-700" />
                  <h3 className="text-slate-900 font-bold">Technical Stack</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-blue-600 font-semibold mb-1 text-sm">Zero-Knowledge</p>
                    <p className="text-slate-600 text-xs">Groth16 zkSNARK</p>
                    <p className="text-slate-400 text-xs">~1.88M constraints</p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-violet-600 font-semibold mb-1 text-sm">Cryptography</p>
                    <p className="text-slate-600 text-xs">BN254 Curve</p>
                    <p className="text-slate-400 text-xs">ECDSA Signatures</p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-emerald-600 font-semibold mb-1 text-sm">Smart Contracts</p>
                    <p className="text-slate-600 text-xs">Solidity 0.8+</p>
                    <p className="text-slate-400 text-xs">Foundry Tested</p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-sky-600 font-semibold mb-1 text-sm">Frontend</p>
                    <p className="text-slate-600 text-xs">Next.js 15</p>
                    <p className="text-slate-400 text-xs">Scaffold-ETH 2</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 shadow-xl mt-6">
                <h3 className="text-slate-900 font-bold mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <Link
                    href="/debug"
                    className="block px-4 py-3 bg-white hover:bg-slate-50 rounded-xl text-slate-700 hover:text-blue-600 transition-colors text-sm font-medium"
                  >
                    Debug Contracts →
                  </Link>
                  <Link
                    href="/blockexplorer"
                    className="block px-4 py-3 bg-white hover:bg-slate-50 rounded-xl text-slate-700 hover:text-blue-600 transition-colors text-sm font-medium"
                  >
                    Block Explorer →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.15;
          }
        }

        @keyframes pulse-slower {
          0%,
          100% {
            opacity: 0.08;
          }
          50% {
            opacity: 0.12;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }

        .animate-pulse-slower {
          animation: pulse-slower 10s ease-in-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
      `}</style>
    </>
  );
};

export default Home;
