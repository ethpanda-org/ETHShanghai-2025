import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
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
    const vaultAddress = useMemo(() => appConfig.vaultAddress ??
        (vaultAddressFromChain ?? undefined), [vaultAddressFromChain]);
    const { data: commitment } = useReadContract({
        abi: globalVaultAbi,
        address: vaultAddress,
        functionName: "currentCommitment",
        query: {
            enabled: Boolean(vaultAddress)
        }
    });
    const commitmentHex = useMemo(() => commitment?.toLowerCase(), [commitment]);
    const poolStateQuery = useQuery({
        queryKey: ["pool-state", commitmentHex],
        queryFn: async () => {
            if (!commitmentHex)
                return null;
            return getPoolState(commitmentHex);
        },
        enabled: Boolean(commitmentHex)
    });
    return {
        vaultAddress,
        commitment: commitmentHex,
        poolState: poolStateQuery.data,
        isLoadingState: poolStateQuery.isLoading || (Boolean(commitmentHex) && !poolStateQuery.data),
        error: poolStateQuery.error
    };
};
