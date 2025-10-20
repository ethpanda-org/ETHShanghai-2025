// app/api/score/route.ts
import { NextResponse } from "next/server";
import { Address, createPublicClient, fallback, getAddress, http } from "viem";
import { sepolia } from "viem/chains";

const SCORE_ADDRESS = (process.env.NEXT_PUBLIC_SCORE_ADDRESS ||
  "0x5b34DE9C5B069070F05bdE9d329B525b4F4BE5d9") as Address;

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
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getScore",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "score",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function buildClient() {
  const transports = [
    process.env.NEXT_PUBLIC_RPC_SEPOLIA &&
      http(process.env.NEXT_PUBLIC_RPC_SEPOLIA, {
        timeout: 30_000,
        retryCount: 2,
        retryDelay: 1_000,
      }),
    process.env.NEXT_PUBLIC_RPC_SEPOLIA_FALLBACK1 &&
      http(process.env.NEXT_PUBLIC_RPC_SEPOLIA_FALLBACK1, {
        timeout: 30_000,
        retryCount: 2,
        retryDelay: 1_000,
      }),
    process.env.NEXT_PUBLIC_RPC_SEPOLIA_FALLBACK2 &&
      http(process.env.NEXT_PUBLIC_RPC_SEPOLIA_FALLBACK2, {
        timeout: 30_000,
        retryCount: 2,
        retryDelay: 1_000,
      }),
  ].filter(Boolean) as ReturnType<typeof http>[];

  return createPublicClient({
    chain: sepolia,
    transport:
      transports.length > 1
        ? fallback(transports)
        : (transports[0] ??
          http("https://1rpc.io/sepolia", {
            timeout: 30_000,
            retryCount: 2,
            retryDelay: 1_000,
          })),
    batch: { multicall: false },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user = url.searchParams.get("user");
    if (!user) return NextResponse.json({ error: "missing user" }, { status: 400 });

    const client = buildClient();
    const res = await client.readContract({
      address: getAddress(SCORE_ADDRESS),
      abi: SCORE_ABI,
      functionName: "getScore",
      args: [getAddress(user as `0x${string}`)],
    });

    // viem 返回 bigint
    return NextResponse.json({ score: Number(res) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.shortMessage || e?.message || String(e) }, { status: 500 });
  }
}
