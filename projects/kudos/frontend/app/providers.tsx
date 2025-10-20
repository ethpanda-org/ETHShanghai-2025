"use client"

import type React from "react"

import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { config } from "@/lib/web3-config"
import { useState } from "react"
import { PostsProvider } from "@/lib/posts-context"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PostsProvider>{children}</PostsProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
