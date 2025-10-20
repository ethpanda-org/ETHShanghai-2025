"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type Eth = any
declare global { interface Window { ethereum?: Eth } }

const HYPER_CHAIN_ID_DEC = 998
const HYPER_CHAIN_ID_HEX = "0x3E6" // 998

export type WalletState = {
  address: string | null
  chainId: number | null
  connected: boolean
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  const connected = !!address

  const detect = useCallback(async () => {
    try {
      const eth = window.ethereum
      if (!eth) return
      const accs: string[] = await eth.request({ method: "eth_accounts" })
      if (accs && accs.length) setAddress(accs[0])
      const cidHex: string = await eth.request({ method: "eth_chainId" })
      setChainId(parseInt(cidHex, 16))
    } catch {}
  }, [])

  useEffect(() => {
    detect()
    const eth = window.ethereum
    if (!eth) return
    const handleAccounts = (accs: string[]) => setAddress(accs && accs.length ? accs[0] : null)
    const handleChain = (cidHex: string) => setChainId(parseInt(cidHex, 16))
    eth.on?.("accountsChanged", handleAccounts)
    eth.on?.("chainChanged", handleChain)
    return () => {
      eth.removeListener?.("accountsChanged", handleAccounts)
      eth.removeListener?.("chainChanged", handleChain)
    }
  }, [detect])

  const ensureHyperChain = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) throw new Error("No wallet provider")
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HYPER_CHAIN_ID_HEX }] })
    } catch (e: any) {
      // 4902: chain not added
      if (e && (e.code === 4902 || String(e.message || "").includes("Unrecognized chain ID"))) {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.hyperliquid-testnet.xyz/evm"
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: HYPER_CHAIN_ID_HEX,
            chainName: "Hyper Testnet",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [rpcUrl],
          }],
        })
      } else {
        throw e
      }
    }
    setChainId(HYPER_CHAIN_ID_DEC)
  }, [])

  const connect = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) throw new Error("No wallet provider")
    const accounts: string[] = await eth.request({ method: "eth_requestAccounts" })
    setAddress(accounts[0])
    await ensureHyperChain()
  }, [ensureHyperChain])

  return {
    address,
    chainId,
    connected,
    connect,
    ensureHyperChain,
    isHyper: chainId === HYPER_CHAIN_ID_DEC,
  }
}

