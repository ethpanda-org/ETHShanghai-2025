import { useState } from 'react'
import TokenSelectorModal from './TokenSelectorModal'
import { formatTokenSymbol } from '../constants/tokens'

export default function SwapTokenSelect({
  token,
  onTokenSelect,
  disabled = false
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true)
    }
  }

  const handleTokenSelect = (selectedToken) => {
    onTokenSelect(selectedToken)
    setIsModalOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={disabled}
        className={`
          flex items-center gap-3 px-4 rounded-2xl border transition-all duration-200 min-w-[180px] h-[52px]
          ${disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:shadow-md cursor-pointer'
          }
        `}
      >
        {token ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              {token.symbol.slice(0, 2)}
            </div>
            <span className="font-medium text-slate-900">{formatTokenSymbol(token)}</span>
            </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-slate-500 font-medium">Select Token</div>
          </div>
        )}

        {!disabled && (
          <svg className="w-5 h-5 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      <TokenSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectToken={handleTokenSelect}
        selectedToken={token}
      />
    </>
  )
}