import { useContractReads } from "wagmi";
import { useDeployedContractInfo, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { getTargetNetwork } from "~~/utils/scaffold-eth";
import { AbiFunctionReturnType, ContractAbi } from "~~/utils/scaffold-eth/contract";

export const useCommentsReader = (commentCount: bigint | undefined) => {
  const { data: deployedContract } = useDeployedContractInfo("OnChainBook");
  const contractReadsParams = [];
  for (let i = 0; i < (commentCount || 0); i++) {
    const args = [BigInt(i)];
    contractReadsParams.push({
      chainId: getTargetNetwork().id,
      contractName: "OnChainBook",
      functionName: "comments",
      address: deployedContract?.address,
      abi: deployedContract?.abi,
      args,
    });
  }
  return useContractReads({ contracts: contractReadsParams, watch: true, enabled: !!commentCount }) as unknown as Omit<
    ReturnType<typeof useContractReads>,
    "data" | "refetch"
  > & {
    data: AbiFunctionReturnType<ContractAbi, "comments"> | undefined;
    refetch: (options?: {
      throwOnError: boolean;
      cancelRefetch: boolean;
    }) => Promise<AbiFunctionReturnType<ContractAbi, "comments">>;
  };
};
