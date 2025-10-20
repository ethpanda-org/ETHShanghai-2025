"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-black/70 border-b border-white/10">
      {/* 顶部荧光条 */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#00FF6A,#00E5FF,#FF3EB5)" }} />
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="h-4 w-4 bg-[color:var(--green)] block" />
          <span className="font-display tracking-[0.22em] text-sm">NOMOS</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/#about" className="opacity-80 hover:opacity-100">
            ABOUT
          </Link>
          <Link href="/#mechanism" className="opacity-80 hover:opacity-100">
            MECHANISM
          </Link>
          <Link href="/dashboard" className="opacity-80 hover:opacity-100">
            DASHBOARD
          </Link>
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}
