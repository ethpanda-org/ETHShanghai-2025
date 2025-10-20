import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  usePublicClient,
  useWalletClient,
  useWaitForTransactionReceipt
} from "wagmi";
import { globalVaultAbi } from "../abis/globalVault";
import { appConfig } from "../lib/config";
import {
  getShieldedBalance,
  subtractShieldedBalance,
  subscribeShieldedBalances
} from "../lib/balances";

export type WithdrawPhase =
  | "idle"
  | "preparing"
  | "awaitingSignature"
  | "pending"
  | "confirmed"
  | "error";

export type WithdrawToken = "WETH" | "USDC";

export type WithdrawRequest = {
  token: WithdrawToken;
  amount: bigint;
  merkleRoot?: `0x${string}`;
};

const TOKEN_ID: Record<WithdrawToken, 0 | 1> = {
  WETH: 0,
  USDC: 1
};

const ensureVaultAddress = () => {
  if (!appConfig.vaultAddress) {
    throw new Error("Vault contract address not configured");
  }
  return appConfig.vaultAddress;
};

const randomBytes32 = (): `0x${string}` => {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without Web Crypto (shouldn't happen in browser)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}` as const;
};

export const useWithdraw = () => {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [phase, setPhase] = useState<WithdrawPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [balances, setBalances] = useState<Record<WithdrawToken, bigint>>({
    WETH: getShieldedBalance("WETH"),
    USDC: getShieldedBalance("USDC")
  });
  const lastRequestRef = useRef<WithdrawRequest | null>(null);

  const transaction = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: Boolean(txHash)
    }
  });

  const isConfirmed = useMemo(
    () => transaction.data?.status === "success",
    [transaction.data?.status]
  );

  const isPending = transaction.isLoading;

  useEffect(() => {
    if (!isConfirmed) return;
    setPhase("confirmed");
  }, [isConfirmed]);

  useEffect(() => {
    if (!transaction.error) return;
    setPhase("error");
    setError(
      transaction.error instanceof Error
        ? transaction.error.message
        : String(transaction.error)
    );
  }, [transaction.error]);

  useEffect(() => {
    const update = () =>
      setBalances({
        WETH: getShieldedBalance("WETH"),
        USDC: getShieldedBalance("USDC")
      });
    const unsubscribe = subscribeShieldedBalances(update);
    update();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isConfirmed || !lastRequestRef.current) return;
    const { token, amount } = lastRequestRef.current;
    try {
      subtractShieldedBalance(token, amount);
    } catch (balanceError) {
      console.warn("Failed to subtract shielded balance", balanceError);
    }
    lastRequestRef.current = null;
  }, [isConfirmed, lastRequestRef]);

  const executeWithdraw = useCallback(
    async ({ token, amount, merkleRoot }: WithdrawRequest) => {
      if (!walletClient || !walletClient.account) {
        throw new Error("Wallet client not connected");
      }
      if (amount <= 0n) {
        throw new Error("Withdraw amount must be greater than zero");
      }

       const available = getShieldedBalance(token);
       if (amount > available) {
         throw new Error("Amount exceeds available shielded balance");
       }

      const vaultAddress = ensureVaultAddress();

      try {
        setPhase("preparing");
        setError(null);

        const root =
          merkleRoot ??
          ((await publicClient.readContract({
            address: vaultAddress,
            abi: globalVaultAbi,
            functionName: "getRoot",
            args: [],
            account: walletClient.account,
            authorizationList: undefined
          })) as `0x${string}`);

        const nullifier = randomBytes32();
        const proof: `0x${string}` = "0x";
        const tokenId = TOKEN_ID[token];
        const account = walletClient.account;
        lastRequestRef.current = { token, amount, merkleRoot };

        const { request } = await publicClient.simulateContract({
          account,
          address: vaultAddress,
          abi: globalVaultAbi,
          functionName: "withdraw",
          args: [proof, root, nullifier, account.address, tokenId, amount]
        });

        setPhase("awaitingSignature");
        const { nonce: _ignoredNonce, ...txRequest } = request;
        const hash = await walletClient.writeContract(txRequest);
        setTxHash(hash as `0x${string}`);
        setPhase("pending");
      } catch (withdrawError) {
        setPhase("error");
        setError(
          withdrawError instanceof Error
            ? withdrawError.message
            : String(withdrawError)
        );
        lastRequestRef.current = null;
        throw withdrawError;
      }
    },
    [publicClient, walletClient]
  );

  return {
    executeWithdraw,
    phase,
    error,
    isPending,
    txHash,
    balances
  };
};
