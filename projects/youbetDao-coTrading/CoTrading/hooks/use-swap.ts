import { useCallback, useState } from "react";
import { erc20Abi, parseUnits } from "viem";
import { useAccount, useSendTransaction, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { config as wagmiConfig } from "@/lib/config";

const MAX_UINT = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

type SwapParams = {
  chainId: number;
  sellToken: string; // ERC20 地址；若原生 ETH 请用 0xEeee... 占位
  buyToken: string;
  decimals: number; // sellToken 的 decimals
};

export function useSwap({
  chainId,
  sellToken,
  buyToken,
  decimals,
}: SwapParams) {
  const { address, chain } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<
    "idle" | "quoting" | "approving" | "submitting" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const swap = useCallback(
    async (amount: string) => {
      try {
        if (!address) throw new Error("请先连接钱包");
        if (chain?.id !== chainId) throw new Error(`请切换到链 ${chainId}`);

        setStatus("quoting");
        const sellAmount = parseUnits(amount, decimals);

        // 1) 请求 0x quote
        const params = new URLSearchParams({
          chainId: String(chainId),
          sellToken,
          buyToken,
          sellAmount: sellAmount.toString(),
          slippageBps: "50",
          taker: address,
        });
        const res = await fetch(`/api/quote?${params}`);
        const quote = await res.json();
        if (!res.ok) throw new Error(quote?.message || "获取报价失败");
        if (quote?.liquidityAvailable === false)
          throw new Error("当前无可用流动性");

        // 2) 授权（原生 ETH 不需要）
        const isNative =
          sellToken.toLowerCase() ===
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
        // 0x v2 返回的授权目标（优先 allowanceTarget）
        const spender: `0x${string}` =
          quote?.allowanceTarget ?? quote?.issues?.allowance?.spender;
        if (!isNative && !spender)
          throw new Error("未获取到授权目标（spender）");

        if (!isNative) {
          // 2.1 读链上 allowance，判断是否足够
          const onchainAllowance = await readContract(wagmiConfig, {
            address: sellToken as `0x${string}`,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, spender],
            chainId,
          });

          if (onchainAllowance < sellAmount) {
            setStatus("approving");
            const approvalHash = await writeContractAsync({
              address: sellToken as `0x${string}`, // 注意：approve 的 to 是 “卖出代币合约”
              abi: erc20Abi,
              functionName: "approve",
              args: [spender, MAX_UINT],
              chainId,
            });
            // 等 1 个确认，避免后面的 swap 因为授权未生效而 revert
            await waitForTransactionReceipt(wagmiConfig, {
              hash: approvalHash,
              confirmations: 1,
              chainId,
            });
          }
        }

        // 3) 发送 swap 交易（to = AllowanceHolder）
        setStatus("submitting");
        const tx = quote.transaction as {
          to: `0x${string}`;
          data: `0x${string}`;
          value?: string;
          gas?: string;
        };
        const hash = await sendTransactionAsync({
          to: tx.to,
          data: tx.data,
          value: tx.value ? BigInt(tx.value) : undefined,
          gas: tx.gas ? BigInt(tx.gas) : undefined,
          chainId,
        });

        setStatus("success");
        return hash;
      } catch (err: any) {
        setError(err?.message || "交易失败");
        setStatus("error");
        throw err;
      }
    },
    [
      address,
      chain?.id,
      chainId,
      sellToken,
      buyToken,
      decimals,
      sendTransactionAsync,
      writeContractAsync,
    ]
  );

  return { swap, status, error };
}
