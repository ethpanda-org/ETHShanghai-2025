import React, { useEffect, useState } from 'react'
import { cx } from '../utils/helpers'
import NetworkStatus from './NetworkStatus'
import { ASSETS } from '../data/mockData'

function NavTab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'relative px-3 h-9 rounded-lg text-sm text-slate-600 hover:text-slate-900',
        active && 'text-slate-900'
      )}
    >
      <span>{children}</span>
      {active && (
        <span className="absolute left-2 right-2 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
      )}
    </button>
  )
}

function WalletButton() {
  const [connected, setConnected] = useState(false)
  const [address] = useState('0xA1B2…F8')
  return (
    <button
      onClick={() => setConnected(!connected)}
      className="rounded-full px-3.5 h-9 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm shadow-sm hover:shadow transition"
      title={connected ? 'Disconnect (mock)' : 'Connect Wallet (mock)'}
    >
      {connected ? address : 'Connect Wallet'}
    </button>
  )
}

function SearchButton({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50"
      title="Global Search (⌘K)"
    >
      <span className="text-slate-400">⌘K</span>
      <span className="hidden lg:inline">Search assets/actions</span>
    </button>
  )
}

function CommandPalette({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-start justify-center p-4">
      <div className="w-full max-w-xl mt-20 rounded-2xl bg-white shadow-lg border border-slate-200">
        <div className="flex items-center gap-2 p-3 border-b">
          <span className="text-slate-400 text-sm">⌘K</span>
          <input
            autoFocus
            placeholder="Enter: asset, swap, structure… (demo)"
            className="flex-1 outline-none text-sm"
          />
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm">✕</button>
        </div>
        <div className="p-3 text-sm text-slate-500">
          This is a demo command palette. In the future, it can support quick navigation, asset search, and common actions.
        </div>
      </div>
    </div>
  )
}

export default function Header({ nav, push }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [lang, setLang] = useState('ZH')

  const handleNav = (key) => {
    if (key === 'markets') return push('markets')
    if (key === 'portfolio') return push('portfolio')
    if (key === 'swap') return push('swap', { assetId: ASSETS[0].id, from: 'USDC', to: `${ASSETS[0].id}:P` })
    if (key === 'structure') return push('structure', { assetId: ASSETS[0].id, tab: 'split-merge' })
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <div className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center">
          {/* Left: Brand + Nav */}
          <div className="flex items-center gap-8">
            <img
              src="/images/logo_black.png"
              alt="AquaFlux"
              className="h-8"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavTab active={nav === 'markets'} onClick={() => handleNav('markets')}>Markets</NavTab>
              <NavTab active={nav === 'swap'} onClick={() => handleNav('swap')}>Swap</NavTab>
              <NavTab active={nav === 'structure'} onClick={() => handleNav('structure')}>Structure</NavTab>
              <NavTab active={nav === 'portfolio'} onClick={() => handleNav('portfolio')}>Portfolio</NavTab>
            </nav>
          </div>

          {/* Right: Utilities */}
          <div className="ml-auto flex items-center gap-2">
            <SearchButton onOpen={() => setPaletteOpen(true)} />
            {/* <button
              className="hidden md:inline-flex items-center justify-center h-9 px-2 rounded-xl border text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => setLang(lang === 'ZH' ? 'EN' : 'ZH')}
              title="Language"
            >
              {lang}
            </button> */}
            {/* <button
              className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-xl border text-sm hover:bg-slate-50"
              title="Theme (demo)"
            >
              🌙
            </button> */}
            {/* <button
              className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-xl border text-sm hover:bg-slate-50"
              title="Notifications (demo)"
            >
              🔔
            </button> */}
            <div className="hidden md:block">
              <NetworkStatus />
            </div>
            <WalletButton />
          </div>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}


