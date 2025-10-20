"use client"

import { useEffect, useMemo, useState } from "react"
import { ethers } from "ethers"

const VAULT_ABI = [
  "function ps() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function performanceFeeP() view returns (uint256)",
  "function lockMinSeconds() view returns (uint256)",
  "function isPrivate() view returns (bool)",
  "function asset() view returns (address)",
]

const ERC20_ABI = ["function decimals() view returns (uint8)"]

export type OnchainVault = {
  unitNav?: number
  aum?: number
  lockDays?: number
  perfFeeP?: number
  totalSupply?: number
  isPrivate?: boolean
  assetAddress?: string
}

export function useOnchainVault(address: string) {
  const [data, setData] = useState<OnchainVault>({})
  const provider = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_RPC_URL
    return url ? new ethers.JsonRpcProvider(url) : null
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!provider || !ethers.isAddress(address)) return
      try {
        const vault = new ethers.Contract(address, VAULT_ABI, provider)
        const [ps, assets, supply, fee, lock, priv, assetAddr] = await Promise.all([
          vault.ps(),
          vault.totalAssets(),
          vault.totalSupply(),
          vault.performanceFeeP(),
          vault.lockMinSeconds(),
          vault.isPrivate(),
          vault.asset(),
        ])
        let assetDecimals = 18
        if (ethers.isAddress(assetAddr)) {
          try {
            const token = new ethers.Contract(assetAddr, ERC20_ABI, provider)
            assetDecimals = await token.decimals()
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[useOnchainVault] asset decimals lookup failed", err)
            }
          }
        }
        if (cancelled) return
        const nav = Number(ps) / 1e18
        setData({
          unitNav: nav,
          aum: Number(ethers.formatUnits(assets, assetDecimals)),
          lockDays: Math.floor(Number(lock) / 86400),
          perfFeeP: Number(fee),
          totalSupply: Number(supply) / 1e18,
          isPrivate: Boolean(priv),
          assetAddress: ethers.isAddress(assetAddr) ? assetAddr : undefined,
        })
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[useOnchainVault]", e)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [address, provider])

  return data
}
