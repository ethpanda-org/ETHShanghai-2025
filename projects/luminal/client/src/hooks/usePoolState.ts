import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { erc20Abi } from "viem";
import { privacyAmmAbi } from "../abis/privacyAmm";
import { globalVaultAbi } from "../abis/globalVault";
import { appConfig } from "../lib/config";
import { getPoolState } from "../lib/state";

export const usePoolState = () => {
  const ammAddress = appConfig.ammAddress;

  const { data: vaultAddressFromChain } = useReadContract({
    abi: privacyAmmAbi,
    address: ammAddress,
    functionName: "vault",
    query: {
      enabled: Boolean(ammAddress && !appConfig.vaultAddress)
    }
  });

  const vaultAddress = useMemo(
    () =>
      appConfig.vaultAddress ??
      ((vaultAddressFromChain as Address | undefined) ?? undefined),
    [vaultAddressFromChain]
  );

  const { data: commitment } = useReadContract({
    abi: globalVaultAbi,
    address: vaultAddress,
    functionName: "currentCommitment",
    query: {
      enabled: Boolean(vaultAddress)
    }
  });

  const { data: merkleRoot } = useReadContract({
    abi: globalVaultAbi,
    address: vaultAddress,
    functionName: "getRoot",
    query: {
      enabled: Boolean(vaultAddress)
    }
  });

  const commitmentHex = useMemo(
    () => (commitment as `0x${string}` | undefined)?.toLowerCase(),
    [commitment]
  );

  // 从链上读取 Vault 的 WETH 和 USDC 余额
  const { data: wethBalance } = useReadContract({
    abi: erc20Abi,
    address: appConfig.wethAddress,
    functionName: "balanceOf",
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: Boolean(vaultAddress && appConfig.wethAddress)
    }
  });

  const { data: usdcBalance } = useReadContract({
    abi: erc20Abi,
    address: appConfig.usdcAddress,
    functionName: "balanceOf",
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: Boolean(vaultAddress && appConfig.usdcAddress)
    }
  });

  const initialPoolState = useMemo(() => ({
    reserve0: wethBalance ?? 10n * 10n ** 18n,
    reserve1: usdcBalance ?? 20_000n * 10n ** 6n,
    nonce: 0n,
    feeBps: 0n
  }), [wethBalance, usdcBalance]);

  const poolStateQuery = useQuery({
    queryKey: ["pool-state", commitmentHex],
    queryFn: async () => {
      if (!commitmentHex) {
        return initialPoolState;
      }
      return getPoolState(commitmentHex);
    },
    enabled: true, // Always run query
    retry: 3,
    staleTime: 0,
    initialData: initialPoolState
  });

  return {
    vaultAddress,
    commitment: commitmentHex,
    merkleRoot: merkleRoot as `0x${string}` | undefined,
    poolState: poolStateQuery.data,
    isLoadingState: false,
    error: null
  };
};
