"use client";

import { useState } from "react";
import { Address, getAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

const SCORE_ABI = [
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

export default function SetScoreButton() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [val, setVal] = useState<string>("123");

  const scoreAddr = (process.env.NEXT_PUBLIC_SCORE_ADDRESS || "0x5b34DE9C5B069070F05bdE9d329B525b4F4BE5d9") as Address;

  return (
    <div className="flex items-center gap-2">
      <input
        className="input w-28"
        type="number"
        min={0}
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="Score"
      />
      <button
        className="pixel-btn"
        disabled={isPending || !address}
        onClick={() =>
          writeContract({
            address: getAddress(scoreAddr),
            abi: SCORE_ABI,
            functionName: "setScore",
            args: [getAddress(address as `0x${string}`), BigInt(val || "0")],
          })
        }
      >
        {isPending ? "Setting…" : "Set Score"}
      </button>
    </div>
  );
}
