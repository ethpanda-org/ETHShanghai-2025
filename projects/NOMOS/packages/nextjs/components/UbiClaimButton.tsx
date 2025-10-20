"use client";

import { useDemo } from "@/lib/demoStore";
import { Address, getAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

const VAULT_ABI = [
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
  },
] as const;

export default function UbiClaimButton() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const demo = useDemo();
  const VAULT_ADDR = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "") as Address;

  async function claim() {
    if (!address) return alert("请先连接钱包");
    if (!VAULT_ADDR) {
      const got = demo.claimUBI();
      return alert(`（Demo）Claimed ${got} U`);
    }
    try {
      // 先试 claim()
      await writeContract({ address: getAddress(VAULT_ADDR), abi: VAULT_ABI, functionName: "claim" });
      alert("Claim 提交成功（claim）");
    } catch {
      try {
        // 再试 claim(address)
        await writeContract({
          address: getAddress(VAULT_ADDR),
          abi: VAULT_ABI,
          functionName: "claim",
          args: [getAddress(address as `0x${string}`)],
        });
        alert("Claim 提交成功（claim(to)）");
      } catch (e: any) {
        const got = demo.claimUBI();
        alert(`链上 Claim 失败，已回退到 Demo：+${got} U。\n` + (e?.message || e));
      }
    }
  }

  return (
    <button className="pixel-btn" onClick={claim} disabled={isPending}>
      {isPending ? "Claiming…" : "Claim UBI"}
    </button>
  );
}
