"use client";

import { Address, getAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

const SBT_ABI = [
  // 常见两种签名，前端会依次尝试
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "mintTo",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
  },
] as const;

export default function SbtMintButton({ onSuccess }: { onSuccess?: () => void }) {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const SBT_ADDR = (process.env.NEXT_PUBLIC_SBT_ADDRESS || "") as Address;

  async function mint() {
    if (!address) return alert("请先连接钱包");
    if (!SBT_ADDR) {
      alert("未配置 SBT 合约地址，进入 Demo 兜底：已模拟铸造成功。");
      onSuccess?.();
      return;
    }
    try {
      // 先尝试 mint()
      await writeContract({ address: getAddress(SBT_ADDR), abi: SBT_ABI, functionName: "mint" });
      alert("SBT 铸造提交成功（mint）");
      onSuccess?.();
    } catch {
      try {
        // 再尝试 mintTo(address)
        await writeContract({
          address: getAddress(SBT_ADDR),
          abi: SBT_ABI,
          functionName: "mintTo",
          args: [getAddress(address as `0x${string}`)],
        });
        alert("SBT 铸造提交成功（mintTo）");
        onSuccess?.();
      } catch (e: any) {
        alert("链上铸造失败，进入 Demo 兜底：已模拟铸造成功。\n" + (e?.message || e));
        onSuccess?.();
      }
    }
  }

  return (
    <button className="pixel-btn" onClick={mint} disabled={isPending}>
      {isPending ? "Minting…" : "Mint SBT"}
    </button>
  );
}
