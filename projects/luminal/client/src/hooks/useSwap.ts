import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useWalletClient,
  useWaitForTransactionReceipt,
  usePublicClient
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { privacyAmmAbi } from "../abis/privacyAmm";
import { appConfig } from "../lib/config";
import type { PoolState } from "../lib/types";
import {
  calculateMinimumOut,
  calculatePriceImpactBps,
  calculateSwap,
  formatBigint
} from "../lib/math";
import { buildCircuitInput } from "../lib/witness";
import { generateSwapProof, packProofForContract } from "../lib/prover";
import { cachePoolState } from "../lib/state";
import { addShieldedBalance } from "../lib/balances";
import { hexFromBigInt } from "../lib/commitment";

export type SwapPhase =
  | "idle"
  | "calculating"
  | "proving"
  | "awaitingSignature"
  | "pending"
  | "confirmed"
  | "error";

export type SwapRequest = {
  amountIn: bigint;
  slippageBps: number;
};

export type SwapResult = {
  txHash?: `0x${string}`;
  minimumAmountOut: bigint;
  expectedAmountOut: bigint;
  priceImpactBps: number;
};

const formatError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "string"
    ? error
    : "Unknown error";

export const useSwap = (poolState: PoolState | null) => {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SwapResult | null>(null);
  const computationRef = useRef<Awaited<ReturnType<typeof calculateSwap>> | null>(
    null
  );
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const transaction = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: Boolean(txHash)
    }
  });

  const isPending = transaction.isLoading;
  const isConfirmed = transaction.data?.status === "success";

  useEffect(() => {
    if (!isConfirmed) return;
    setPhase("confirmed");
  }, [isConfirmed]);

  useEffect(() => {
    if (!transaction.error) return;
    setPhase("error");
    setError(formatError(transaction.error));
  }, [transaction.error]);

  const executeSwap = useCallback(
    async ({ amountIn, slippageBps }: SwapRequest) => {
      if (!poolState) {
        throw new Error("Pool state not ready");
      }
      if (!appConfig.ammAddress) {
        throw new Error("AMM contract address not configured");
      }
      if (!walletClient || !walletClient.account) {
        throw new Error("Wallet client not connected");
      }

      const account = walletClient.account;

      try {
        setPhase("calculating");
        setError(null);
        setResult(null);

        const computation = await calculateSwap(poolState, amountIn);
        computationRef.current = computation;

        const priceImpactBps = calculatePriceImpactBps(
          computation.stateOld,
          computation.stateNew
        );
        const minimumAmountOut = calculateMinimumOut(
          computation.amountOut,
          slippageBps
        );

        setResult({
          expectedAmountOut: computation.amountOut,
          minimumAmountOut,
          priceImpactBps,
          txHash: undefined
        });

        setPhase("proving");
        const circuitInput = buildCircuitInput(computation);
        const proof = await generateSwapProof(circuitInput);

        const packed = await packProofForContract(proof);

        const { request } = await publicClient.simulateContract({
          account,
          address: appConfig.ammAddress,
          abi: privacyAmmAbi,
          functionName: "swap",
          args: [
            packed.pA,
            packed.pB,
            packed.pC,
            hexFromBigInt(computation.commitmentNew),
            computation.stateOld.nonce
          ]
        });

        setPhase("awaitingSignature");

        const { nonce: _ignored, ...txRequest } = request;
        const txHashValue = await walletClient.writeContract(txRequest);
        const resolvedTxHash = txHashValue as `0x${string}`;
        setTxHash(resolvedTxHash);
        setPhase("pending");
        setResult((prev) =>
          prev
            ? {
                ...prev,
                txHash: resolvedTxHash
              }
            : prev
        );
      } catch (swapError) {
        setPhase("error");
        setError(formatError(swapError));
        computationRef.current = null;
        throw swapError;
      }
    },
    [poolState, walletClient, publicClient]
  );

  useEffect(() => {
    if (!isConfirmed || !computationRef.current) return;
    const computation = computationRef.current;
    cachePoolState(computation.commitmentNew, computation.stateNew);
    addShieldedBalance("USDC", computation.amountOut);
    queryClient
      .invalidateQueries({ queryKey: ["pool-state"] })
      .catch((err) => console.warn("Failed to invalidate query", err));
    computationRef.current = null;
  }, [isConfirmed, queryClient]);

  const summary = useMemo(() => {
    if (!poolState || !result) return null;

    const reservesText = `${formatBigint(poolState.reserve0, 18, 2)} ETH / ${formatBigint(
      poolState.reserve1,
      6,
      2
    )} USDC`;

    return {
      reservesText,
      priceImpactBps: result.priceImpactBps,
      minimumOut: result.minimumAmountOut,
      expectedOut: result.expectedAmountOut,
      txHash: result.txHash
    };
  }, [poolState, result]);

  return {
    executeSwap,
    phase,
    error,
    isPending,
    summary
  };
};
