import { useEffect } from "react";
import { useRouter } from "next/router";
import type { NextPage } from "next";
import { useLocalStorage } from "usehooks-ts";
import { MetaHeader } from "~~/components/MetaHeader";
import { ContractUI } from "~~/components/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { ContractName, contracts } from "~~/utils/scaffold-eth/contract";
import { getContractNames } from "~~/utils/scaffold-eth/contractNames";

const selectedContractStorageKey = "scaffoldEth2.selectedContract";
const contractNames = getContractNames();

const Debug: NextPage = () => {
  const router = useRouter();
  const { contract, addr } = router.query;

  // Get contract name from URL
  const contractFromUrl = Array.isArray(contract) ? contract[0] : contract;

  // Get custom address from URL query parameter
  const customAddress = typeof addr === "string" ? addr : undefined;

  const [selectedContract, setSelectedContract] = useLocalStorage<ContractName>(
    selectedContractStorageKey,
    contractNames[0],
  );

  // Update selected contract when URL changes or when router is ready
  useEffect(() => {
    if (!router.isReady) return; // Wait for router to be ready

    if (contractFromUrl && contractNames.includes(contractFromUrl as ContractName)) {
      // URL has a valid contract name, use it
      setSelectedContract(contractFromUrl as ContractName);
    } else if (!contractFromUrl) {
      // No contract in URL (base /debug route), ensure we have a valid selection
      if (!contractNames.includes(selectedContract)) {
        setSelectedContract(contractNames[0]);
      }
      // Update URL to reflect current selection
      if (selectedContract && contractNames.includes(selectedContract)) {
        router.replace(`/debug/${String(selectedContract)}`, undefined, { shallow: true });
      }
    } else {
      // Invalid contract name in URL, fallback to first contract
      setSelectedContract(contractNames[0]);
      router.replace(`/debug/${String(contractNames[0])}`, undefined, { shallow: true });
    }
  }, [router.isReady, contractFromUrl, selectedContract, setSelectedContract, router]);

  // Update URL when contract selection changes (without page reload)
  const handleContractChange = (contractName: ContractName) => {
    setSelectedContract(contractName);
    router.push(`/debug/${String(contractName)}`, undefined, { shallow: true });
  };

  return (
    <>
      <MetaHeader
        title={`Debug ${String(selectedContract)} | Scaffold-ETH 2`}
        description={`Debug your deployed ${String(selectedContract)} contract in an easy way`}
      />
      <div className="flex flex-col gap-y-6 lg:gap-y-8 py-8 lg:py-12 justify-center items-center">
        {contractNames.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-3xl font-bold mb-4">No contracts found!</h2>
            <p className="text-lg text-gray-600 mb-6">No contracts are configured for the current network.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
              <h3 className="font-semibold text-blue-800 mb-2">Available Contracts:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• BodhiBasedCopyright - Main copyright contract</li>
                <li>• License - License management contract</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {contractNames.length > 1 && (
              <div className="flex flex-row gap-2 w-full max-w-7xl pb-1 px-6 lg:px-10 flex-wrap">
                {contractNames.map(contractName => (
                  <button
                    className={`btn btn-secondary btn-sm normal-case font-thin ${
                      contractName === selectedContract ? "bg-base-300" : "bg-base-100"
                    }`}
                    key={String(contractName)}
                    onClick={() => handleContractChange(contractName)}
                  >
                    {String(contractName)}
                  </button>
                ))}
              </div>
            )}
            {contractNames.map(contractName => (
              <ContractUI
                key={String(contractName)}
                contractName={contractName}
                className={contractName === selectedContract ? "" : "hidden"}
                customAddress={contractName === selectedContract ? customAddress : undefined}
              />
            ))}
          </>
        )}
      </div>
      <div className="flex justify-center mt-8">
        <div className="text-center bg-secondary p-10 rounded-xl shadow-lg">
          <h1 className="text-4xl my-0">Debug Contracts</h1>
          <p className="text-neutral mt-4">You can debug & interact with your deployed contracts here.</p>

          {/* Contract Information Cards */}
          {contractNames.length > 0 && (
            <div className="mt-8">
              {contractNames.map(contractName => {
                const contractData =
                  contracts?.[scaffoldConfig.targetNetwork.id]?.[0]?.contracts?.[String(contractName)];
                return (
                  <div
                    key={String(contractName)}
                    className="bg-base-100 rounded-lg p-4 border border-base-300 mb-4 last:mb-0"
                  >
                    <h3 className="text-lg font-bold mb-2">{String(contractName)}</h3>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Address:</span>
                        <code className="ml-2 text-xs bg-base-200 px-1 rounded">{contractData?.address || "N/A"}</code>
                      </div>
                      <div>
                        <span className="font-semibold">Network:</span>
                        <span className="ml-2">{scaffoldConfig.targetNetwork.name}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Chain ID:</span>
                        <span className="ml-2">{scaffoldConfig.targetNetwork.id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Debug;
