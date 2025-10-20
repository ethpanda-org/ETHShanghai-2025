"use client"

import { WagmiConfig } from "wagmi"
import { config } from "@/lib/wagmi"
import { type ReactNode } from "react"

export function Web3Provider({ children }: { children: ReactNode }) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>
}
