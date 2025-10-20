import { useEffect, useState } from "react";
import Image from "next/image";
import { NextPage } from "next";
import ReactMarkdown from "react-markdown";
import { useAccount, useContractReads } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

interface Dataset {
  id: number;
  name: string;
  link: string;
  contentHash: string;
  uri: string;
  bodhi_id: number;
  owner: string;
  abstract?: string;
}

const DatasetGallery: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "my">("all");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Get contract info
  const { data: copyrightNFTContract } = useDeployedContractInfo("CopyrightNFT");
  const { data: bodhiBasedCopyrightContract } = useDeployedContractInfo("BodhiBasedCopyright");

  // 读取 dataset 总数
  const { data: nextTokenIdResult } = useContractReads({
    contracts: [
      {
        chainId: getTargetNetwork().id,
        address: copyrightNFTContract?.address,
        abi: copyrightNFTContract?.abi,
        functionName: "_nextTokenId",
      },
    ],
    watch: true,
    enabled: !!copyrightNFTContract,
  });

  console.log("nextTokenIdResult", nextTokenIdResult);

  const nextTokenId = nextTokenIdResult?.[0]?.result;

  console.log("nextTokenId", nextTokenId);

  // Prepare contract read params for datasets and owners
  const contractReadsParams = [];
  for (let i = 1; i <= 5; i++) {
    // Add dataset read
    if (bodhiBasedCopyrightContract?.address && bodhiBasedCopyrightContract?.abi) {
      contractReadsParams.push({
        chainId: getTargetNetwork().id,
        address: bodhiBasedCopyrightContract.address,
        abi: bodhiBasedCopyrightContract.abi,
        functionName: "getCopyright",
        args: [BigInt(i)],
      });
    }

    // Add owner read
    if (copyrightNFTContract?.address && copyrightNFTContract?.abi) {
      contractReadsParams.push({
        chainId: getTargetNetwork().id,
        address: copyrightNFTContract.address,
        abi: copyrightNFTContract.abi,
        functionName: "ownerOf",
        args: [BigInt(i)],
      });
    }
  }

  // Batch read all datasets and owners
  const { data: batchResults } = useContractReads({
    contracts: contractReadsParams,
    watch: true,
    enabled: !!bodhiBasedCopyrightContract && !!copyrightNFTContract,
  });

  useEffect(() => {
    if (!nextTokenId || !batchResults) {
      setLoading(false);
      return;
    }

    // Split results into datasets and owners inside useEffect
    const datasetResults = batchResults.filter((_, index) => index % 2 === 0);
    const ownerResults = batchResults.filter((_, index) => index % 2 === 1);

    const fetchedDatasets = datasetResults
      .map((data, index) => {
        console.log("data", data);
        // skip this one if the data["result"] is undefined
        if (!data || !(data as any)?.result || !ownerResults[index]) return null;

        const [name, link, contentHash, , uri, bodhi_id] = (data as any).result; // Skip licenseId
        const ownerData = ownerResults[index];
        const owner = (ownerData as any)?.result;

        // Ensure owner is a string
        if (typeof owner !== "string") return null;

        const dataset: Dataset = {
          id: index + 1,
          name,
          link,
          contentHash: contentHash.toString(),
          uri: uri, // Using uri from contract data
          bodhi_id: Number(bodhi_id),
          owner,
        };
        return dataset;
      })
      .filter((dataset): dataset is Dataset => dataset !== null);

    setDatasets(fetchedDatasets);

    // Fetch abstracts for datasets with bodhi_id
    fetchedDatasets.forEach(dataset => {
      if (dataset.bodhi_id > 0) {
        fetchAbstract(dataset.bodhi_id, dataset.id);
      }
    });

    setLoading(false);
  }, [nextTokenId, batchResults]);

  const fetchAbstract = async (bodhiId: number, datasetId: number) => {
    try {
      const response = await fetch(`https://bodhi-data.deno.dev/assets?asset_begin=${bodhiId}&asset_end=${bodhiId}`);
      const data = await response.json();
      if (data.assets && data.assets[0] && data.assets[0].content) {
        // Get first 10 lines of the content
        const lines = data.assets[0].content.split("\n");
        const first10Lines = lines.slice(0, 10).join("\n");
        setDatasets(prev => prev.map(ds => (ds.id === datasetId ? { ...ds, abstract: first10Lines } : ds)));
      }
    } catch (error) {
      console.error(`Failed to fetch abstract for bodhi_id ${bodhiId}:`, error);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHash(id);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const filteredDatasets = datasets;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">加载 Dataset 数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🗂️ Dataset 展览馆</h1>
        <p className="text-gray-600">
          浏览所有已创建的数据集 NFT，创建意味着被存证和确权，如果 Tokenized，则可以购买数据集的股份！
        </p>
        <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">总计: {nextTokenId ? Number(nextTokenId) - 1 : 0} 个数据集</span>
            {/* {connectedAddress && (
              <span className="text-sm text-gray-500">
                已连接: <Address address={connectedAddress} />
              </span>
            )} */}
          </div>

          {/* Filter Buttons */}
          {connectedAddress && (
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === "all" ? "bg-primary text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilter("my")}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === "my" ? "bg-primary text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                我的数据集
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Cards Grid */}
      {filteredDatasets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">{filter === "my" ? "您还没有创建任何数据集" : "暂无数据集"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasets.map(dataset => (
            <div
              key={dataset.id}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200"
            >
              {/* Dataset Image/Icon */}
              <div className="bg-gradient-to-br from-blue-400 to-purple-600 h-48 flex items-center justify-center relative overflow-hidden">
                {dataset.uri && !imageErrors[dataset.id] ? (
                  <Image
                    src={dataset.uri}
                    alt={dataset.name}
                    fill
                    className="object-cover"
                    onError={() => setImageErrors(prev => ({ ...prev, [dataset.id]: true }))}
                  />
                ) : (
                  <div className="text-white text-6xl">📊</div>
                )}
                {connectedAddress && dataset.owner.toLowerCase() === connectedAddress.toLowerCase() && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold z-10">
                    我的
                  </div>
                )}
              </div>

              {/* Dataset Info */}
              <div className="p-6">
                {/* Dataset ID */}
                <h3 className="text-xl font-bold mb-3">{dataset.name}</h3>

                {/* Content Hash */}
                <div className="mb-2 flex items-center">
                  <span className="text-sm text-gray-600">Content Hash:</span>
                  <span className="ml-2 text-sm font-mono">{formatAddress(dataset.contentHash)}</span>
                  <button
                    onClick={() => copyToClipboard(dataset.contentHash, `hash-${dataset.id}`)}
                    className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy full hash"
                  >
                    {copiedHash === `hash-${dataset.id}` ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-green-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Owner */}
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Owner:</span>
                  <a
                    href={`https://etherscan.io/address/${dataset.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-sm text-blue-600 hover:text-blue-800 truncate block"
                  >
                    {formatAddress(dataset.owner)}
                  </a>
                </div>

                {/* Link */}
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Link:</span>
                  <a
                    href={dataset.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-sm text-blue-600 hover:text-blue-800 truncate block"
                  >
                    {dataset.link}
                  </a>
                </div>

                {/* Bodhi ID */}
                <div className="mb-4">
                  <span className="text-sm text-gray-600">Bodhi ID:</span>
                  <a
                    href={`https://bodhi.wtf/${dataset.bodhi_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    #{dataset.bodhi_id} {/* Display Bodhi ID */}
                  </a>
                </div>

                {/* 摘要 */}
                {dataset.abstract && (
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">摘要:</span>
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg overflow-x-auto max-w-full">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          p: ({ children }) => <p className="mb-2 break-words">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1 break-words">{children}</li>,
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              className="text-blue-600 hover:underline break-all"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                          code: ({ children }) => (
                            <code className="bg-gray-100 px-1 rounded whitespace-pre">{children}</code>
                          ),
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                        }}
                      >
                        {dataset.abstract}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <a href={`https://bodhi.wtf/${dataset.bodhi_id}`} target="_blank" rel="noopener noreferrer">
                    <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                      查看详情
                    </button>
                  </a>
                  &nbsp;
                  <a
                    href={`https://bodhi.wtf/${dataset.bodhi_id}?action=buy`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                      购买份额
                    </button>
                  </a>
                  &nbsp;
                  <a
                    href={`https://bodhi.wtf/${dataset.bodhi_id}?action=sell`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                      卖出份额
                    </button>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold mb-2">{datasets.length}</div>
          <div className="text-blue-100">总数据集数量</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-3xl font-bold mb-2">{datasets.filter(d => d.bodhi_id >= 0).length}</div>
          <div className="text-green-100">Tokenized 数据集数量</div>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">关于 Dataset NFT</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="mb-2">
              <strong>📊 数据集注册：</strong>每个数据集都有唯一的 ID 和 Arweave 交易 ID，确保内容不可篡改。
            </p>
            <p>
              <strong>🔗 许可证绑定：</strong>数据集可以绑定不同类型的许可证，定义使用规则。
            </p>
          </div>
          <div>
            <p className="mb-2">
              <strong>🪙 份额交易：</strong>通过 Bodhi1155 合约，数据集可以被分割成份额进行交易。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetGallery;
