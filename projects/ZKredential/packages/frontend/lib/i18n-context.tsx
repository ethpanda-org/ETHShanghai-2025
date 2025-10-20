"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Locale = "en" | "zh"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (en: string, zh: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  // 使用 "zh" 作为默认值，避免 hydration 错误
  const [locale, setLocale] = useState<Locale>("zh")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const t = (en: string, zh: string) => {
    // 在挂载前使用中文，避免 hydration 错误
    if (!mounted) return zh
    return locale === "zh" ? zh : en
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
