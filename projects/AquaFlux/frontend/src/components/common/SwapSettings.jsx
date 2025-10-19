import React, { useState, useRef, useEffect } from 'react'
import { cx } from '../../utils/helpers'

export default function SwapSettings({
  slippage,
  onSlippageChange,
  deadline,
  onDeadlineChange,
  isOpen,
  onClose,
  className = ""
}) {
  const panelRef = useRef(null)

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={cx("absolute top-10 right-0 z-50", className)}>
      <div
        ref={panelRef}
        className="w-80 p-4 bg-white rounded-2xl border border-slate-200 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Settings</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Slippage Tolerance */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Slippage Tolerance
            </label>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => onSlippageChange(0.001)}
                className={cx(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  slippage === 0.001
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
              >
                0.1%
              </button>
              <button
                onClick={() => onSlippageChange(0.005)}
                className={cx(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  slippage === 0.005
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
              >
                0.5%
              </button>
              <button
                onClick={() => onSlippageChange(0.01)}
                className={cx(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  slippage === 0.01
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
              >
                1.0%
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="50"
                value={(slippage * 100).toFixed(2)}
                onChange={(e) => onSlippageChange(Number(e.target.value) / 100)}
                className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-3 py-2.5 text-sm bg-slate-50 focus:bg-white"
                placeholder="Custom slippage"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
                %
              </div>
            </div>
            {slippage > 0.05 && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ High slippage tolerance may result in unfavorable trades
              </div>
            )}
            {slippage < 0.001 && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                ⚠️ Very low slippage may cause transaction failures
              </div>
            )}
          </div>

          {/* Transaction Deadline */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Transaction Deadline
            </label>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => onDeadlineChange(10)}
                className={cx(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  deadline === 10
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
              >
                10m
              </button>
              <button
                onClick={() => onDeadlineChange(20)}
                className={cx(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  deadline === 20
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
              >
                20m
              </button>
              <button
                onClick={() => onDeadlineChange(30)}
                className={cx(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  deadline === 30
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                )}
              >
                30m
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="180"
                value={deadline}
                onChange={(e) => onDeadlineChange(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-3 py-2.5 text-sm bg-slate-50 focus:bg-white"
                placeholder="Custom deadline"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
                min
              </div>
            </div>
            {deadline > 60 && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ Long deadline may expose you to price movements
              </div>
            )}
          </div>

          {/* Current Settings Summary */}
          <div className="pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Current Slippage:</span>
                <span className="font-medium">{(slippage * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Current Deadline:</span>
                <span className="font-medium">{deadline} minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}