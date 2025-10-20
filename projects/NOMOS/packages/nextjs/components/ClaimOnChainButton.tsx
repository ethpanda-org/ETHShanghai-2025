"use client";

import { useState } from "react";
import { readScore } from "@/lib/nomadAdapter";
import { Address, getAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

const ABI = [
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "s", type: "uint256" },
    ],
    name: "setScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export default function ClaimOnChainButton() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [delta] = useState<number>(10); // 每次 +10 分

  const scoreAddr = (process.env.NEXT_PUBLIC_SCORE_ADDRESS || "0x5b34DE9C5B069070F05bdE9d329B525b4F4BE5d9") as Address;

  async function claim() {
    if (!address) return;
    const cur = await readScore(address);
    await writeContract({
      address: getAddress(scoreAddr),
      abi: ABI,
      functionName: "setScore",
      args: [getAddress(address as `0x${string}`), BigInt(cur + delta)],
    });
    alert(`Claimed +${delta} to ${cur + delta} (on-chain)`);
  }

  return (
    <button className="pixel-btn" disabled={isPending || !address} onClick={claim}>
      {isPending ? "Claiming…" : "Claim UBI (on-chain)"}
    </button>
  );
}
