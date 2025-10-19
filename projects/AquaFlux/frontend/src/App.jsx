import React from 'react'
import useRouter from './hooks/useRouter'
import Header from './components/Header'
import MarketsPage from './pages/MarketsPage'
import SwapPage from './pages/SwapPage'
import BuildPage from './pages/BuildPage'
import { ASSETS } from './data/mockData'
import { cx } from './utils/helpers'

function NavBtn({ active, children, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={cx(
        "px-3 py-2 rounded-xl text-sm", 
        active ? "bg-slate-900 text-white" : "border hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  )
}

export default function App() {
  const { route, push } = useRouter()
  const nav = route.name

  return (
    <div className="min-h-screen w-full bg-slate-100/60">
      <Header nav={nav} push={push} />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {nav === "markets" && <MarketsPage push={push} />}
        {nav === "swap" && <SwapPage params={route.params} push={push} />}
        {nav === "build" && <BuildPage params={route.params} push={push} />}
      </div>
    </div>
  )
}
