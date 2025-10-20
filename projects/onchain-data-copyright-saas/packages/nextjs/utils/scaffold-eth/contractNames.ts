import { Chain } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { ContractName, contracts } from "~~/utils/scaffold-eth/contract";

export function getContractNames() {
  const network = scaffoldConfig.targetNetwork as Chain;
  const contractsData = contracts?.[network.id]?.[0]?.contracts;
  console.log(network);
  console.log(contracts);
  return contractsData ? (Object.keys(contractsData) as ContractName[]) : [];
}
