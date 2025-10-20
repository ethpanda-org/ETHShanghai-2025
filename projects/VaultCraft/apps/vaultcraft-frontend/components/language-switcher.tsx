"use client"

import { SUPPORTED_LOCALES, useLocale } from "./locale-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className={className}>
      <Select value={locale} onValueChange={(val) => setLocale(val as typeof locale)}>
        <SelectTrigger className="w-[120px] h-9 text-sm">
          <SelectValue placeholder={t("language.switcher.label", "Language")} />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LOCALES.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
