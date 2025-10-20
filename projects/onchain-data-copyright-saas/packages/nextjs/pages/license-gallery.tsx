import { useEffect, useState } from "react";
import { NextPage } from "next";
import ReactMarkdown from "react-markdown";
import { useContractReads } from "wagmi";
import { useDeployedContractInfo, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { getTargetNetwork } from "~~/utils/scaffold-eth";
import { AbiFunctionReturnType, ContractAbi, contracts } from "~~/utils/scaffold-eth/contract";


const ArweaveContent = ({ link }: { link: string }) => {
  const [abstract, setAbstract] = useState<string>("");
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(link);
        const text = await response.text();
        const firstFiveLines = text.split("\n").slice(0, 5).join("\n");
        setAbstract(firstFiveLines);
      } catch (error) {
        console.error("Error fetching Arweave content:", error);
      }
    };

    fetchContent();
  }, [link]);

  if (!abstract) return null;

  return (
    <div>
      <span className="text-sm text-gray-600">摘要: &nbsp;&nbsp;</span>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{abstract}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

interface License {
  id: number;
  name: string;
  uri: string;
  link: string;
  bodhi_id: number;
  active: boolean;
  createdAt: number;
}

const useAllLicensesReader = (totalLicenses: number | undefined) => {
  const { data: deployedContract } = useDeployedContractInfo("BodhiBasedCopyright");
  const contractReadsParams = [];

  if (totalLicenses) {
    for (let i = 1; i <= totalLicenses; i++) {
      const args = [BigInt(i)];
      contractReadsParams.push({
        chainId: getTargetNetwork().id,
        address: deployedContract?.address,
        abi: deployedContract?.abi,
        functionName: "getLicense",
        args,
      });
    }
  }

  console.log("contractReadsParams", contractReadsParams);
  return useContractReads({
    contracts: contractReadsParams,
    watch: true,
    enabled: !!totalLicenses && !!deployedContract,
  }) as unknown as Omit<ReturnType<typeof useContractReads>, "data" | "refetch"> & {
    data: AbiFunctionReturnType<ContractAbi, "getLicense">[] | undefined;
    refetch: (options?: {
      throwOnError: boolean;
      cancelRefetch: boolean;
    }) => Promise<AbiFunctionReturnType<ContractAbi, "getLicense">[]>;
  };
};

const LicenseGallery: NextPage = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  // Get total license count from contract
  const { data: nextTokenId, isLoading: isLoadingTokenCount } = useScaffoldContractRead({
    contractName: "LicenseNFT",
    functionName: "_nextTokenId",
  });

  // Calculate total licenses (nextTokenId - 1, since tokenId starts from 1)
  const totalLicenses = nextTokenId ? Number(nextTokenId) - 1 : 0;

  // 获取所有 licenses，
  // get linceses by call the contract BodhiBasedCopyright, use the function getLicense one by one by the licenseId, the licenseId is from 1 to totalLicenses
  // Use the batch reader hook to get all licenses
  const { data: licenseData } = useAllLicensesReader(totalLicenses);

  console.log("licenseData", licenseData);
  useEffect(() => {
    if (!totalLicenses || !licenseData) {
      setLoading(false);
      return;
    }

    const fetchedLicenses = licenseData
      .map((data, index) => {
        if (!data) return null;
        console.log("data", data);
        const [name, uri, link, bodhi_id] = data["result"];
        return {
          id: index + 1,
          name,
          uri,
          link,
          bodhi_id: Number(bodhi_id),
          active: true,
          createdAt: Date.now(),
        };
      })
      .filter((license): license is License => license !== null);

    setLicenses(fetchedLicenses);
    setLoading(false);
  }, [totalLicenses, licenseData]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">加载 License 数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">📜 License 展览馆</h1>
        <p className="text-gray-600">
          浏览所有已创建的数据许可证（License）模板，License 是 NFT，并将其内容存储在 Bodhi 上！
        </p>

        {/* Contract Info */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">LicenseNFT Contract Info</h2>
          {(() => {
            const network = scaffoldConfig.targetNetwork;
            const contractData = contracts?.[network.id]?.[0]?.contracts?.["LicenseNFT"];

            if (!contractData) {
              return (
                <p className="text-red-600">
                  Contract not found on network: {network.name} (Chain ID: {network.id})
                </p>
              );
            }

            return (
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Contract Address: </span>
                  <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">{contractData.address}</code>
                </div>
                <div>
                  <span className="font-semibold">Network: </span>
                  <span className="ml-2">{network.name}</span>
                </div>
                <div>
                  <span className="font-semibold">Chain ID: </span>
                  <span className="ml-2">{network.id}</span>
                </div>
                <div className="mt-4">
                  <a
                    href={`${network.blockExplorers?.default.url}/address/${contractData.address}#code`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View on {network.blockExplorers?.default.name} 🔍
                  </a>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">链上许可证总数:</span>
            {isLoadingTokenCount ? (
              <div className="animate-pulse bg-gray-200 rounded h-4 w-8"></div>
            ) : (
              <span className="text-sm font-semibold text-primary">{totalLicenses}</span>
            )}
          </div>
        </div>
      </div>

      {/* License Cards Grid */}
      {licenses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">暂无许可证数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {licenses.map(license => (
            <div
              key={license.id}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200"
            >
              {/* License Image/Icon */}
              <div className="bg-gradient-to-br from-purple-400 to-indigo-600 h-48 relative overflow-hidden">
                {license.uri ? (
                  <img
                    src={license.uri}
                    alt={license.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.currentTarget.src = "/assets/placeholder.svg";
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-white text-6xl">📜</div>
                  </div>
                )}
              </div>

              {/* License Info */}
              <div className="p-6">
                {/* License Name */}
                <h3 className="text-xl font-bold mb-2 truncate">{license.name}</h3>

                {/* License ID */}
                <div className="mb-2">
                  <span className="text-sm text-gray-600">License ID:</span>
                  <span className="ml-2 text-sm font-mono font-semibold">#{license.id}</span>
                </div>

                {/* Created Time */}
                <div className="mb-4">
                  <span className="text-sm text-gray-600">创建时间:</span>
                  <span className="ml-2 text-sm">{formatDate(license.createdAt)}</span>
                </div>

                {/* Abstract */}
                {license.link?.startsWith("https://arweave.net/") && <ArweaveContent link={license.link} />}

                {/* Details */}
                <div className="mb-4">
                  <span className="text-sm text-gray-600">查看详情:</span>
                  <a
                    href={`https://bodhi.wtf/${license.bodhi_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-sm text-blue-600 hover:text-blue-800 truncate block"
                  >
                    {license.bodhi_id}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">许可证类型说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
              禁止衍生
            </span>
            <p className="text-sm text-gray-600">数据集只能按原样使用，不允许创建衍生作品</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
              完全开放
            </span>
            <p className="text-sm text-gray-600">数据集可以自由使用，包括创建衍生作品</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              部分回流
            </span>
            <p className="text-sm text-gray-600">允许衍生作品，但部分收益回流给原作者</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseGallery;
