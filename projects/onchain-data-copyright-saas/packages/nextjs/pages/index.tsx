import { useEffect, useState } from "react";
import Image from "next/image";
import { NextPage } from "next";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

// Available NFT URI images
const NFT_URI_OPTIONS = [
  "https://node1.irys.xyz/gSUbLPcGMQeHocRqDnXz1xij8VGzttDx_xmoK-pCcqc",
  "https://node1.irys.xyz/iXAgEObmPoLPrR_RW3Fw8CAI7SZsBdCGA6oDiUXOReM",
  "https://node1.irys.xyz/cH1CvVgs4Lzp5xupzKRa0qBgfkcTtQYC_fZQYHTILz8",
  "https://node1.irys.xyz/x3k8CsU1STaFpIoiL2zcx-NkuDd4GDkdKH6kuSXadIE",
];

// Mock data for licenses
const LICENSE_OPTIONS = [
  {
    id: "cc0",
    name: "CC0 - No Rights Reserved",
    usage: "Free to use, modify, distribute, and sell without any restrictions",
    profit: "100% profit goes to the user, no royalties required",
    bodhi_id: 15544,
    nft_id: 1,
  },
  {
    id: "cc0+ with profit item",
    name: "CC0+ 1.0 Universal (with item about profit)",
    usage: "Free to use, modify, distribute, and sell, with a 5% revenue contribution clause",
    profit:
      "Users retain 95% of all profits; 5% or more must return to the Original Data Provider. We will distribute the profit to the token holders",
    bodhi_id: 15547,
    nft_id: 2,
  },
];

//定义一个新的数据类型来记录后端返回的数据
export type resultByDataset = {
  dataset_id: string;
  results: search_result[];
};
//定义一个数据类型来记录每个搜索结果
export type search_result = {
  id: string;
  data: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  metadata: {};
};

// 定义AI agent的数据类型
export type AIAgent = {
  id: number;
  name: string;
  description: string;
  contract_addr: string;
  owner_addr: string;
  bodhi_id: number;
  version: string;
  created_at: string;
  updated_at: string | null;
  prompts: number[];
  on_chain_knowledges: number[];
  off_chain_knowledges: any[];
  landing_page: string;
};

const ETHSpace: NextPage = () => {
  // State for selected license
  const [selectedLicense, setSelectedLicense] = useState(LICENSE_OPTIONS[0]);

  // State for dataset form
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [datasetHash, setDatasetHash] = useState("");
  const [isTokenized, setIsTokenized] = useState(false);
  const [datasetLink, setDatasetLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [bodhiId, setBodhiId] = useState("");
  const [nftUri, setNFTUri] = useState("https://node1.irys.xyz/gSUbLPcGMQeHocRqDnXz1xij8VGzttDx_xmoK-pCcqc");

  // Contract write hook for generating copyright
  const { writeAsync: generateCopyright, isLoading: isCreating } = useScaffoldContractWrite({
    contractName: "BodhiBasedCopyright",
    functionName: "generateCopyright",
    args: [
      datasetHash,
      datasetName,
      BigInt(selectedLicense.nft_id),
      nftUri,
      "https://bodhi.wtf/" + bodhiId,
      BigInt(isTokenized ? bodhiId : "0"),
    ],
  });

  // Handle dataset creation
  const handleCreateDataset = async () => {
    try {
      await generateCopyright();
      // Reset form after successful creation
      // You can add success toast notification here
    } catch (error) {
      console.error("Error creating dataset:", error);
      // You can add error toast notification here
    }
  };

  // Copy dataset information as markdown
  const copyAsMarkdown = async () => {
    const markdown = `
**Name**: ${datasetName}

**Description**: ${datasetDescription}

**Hash**: ${datasetHash}

**License**: [https://bodhi.wtf/${selectedLicense.bodhi_id}](https://bodhi.wtf/${selectedLicense.bodhi_id})

**Tokenized**: ${isTokenized ? "true" : "false"}

**Details**: ${datasetLink}
`;

    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // 格式化地址为简短格式
  // const formatAddress = (address: string) => {
  //   if (!address) return "";
  //   return `${address.slice(0, 4)}...${address.slice(-2)}`;
  // };
  //初始化AI agents数据
  const init = async () => {
    // 暂时使用提供的示例数据，稍后可以从API获取
    const response = await fetch("https://ai-agent-api.deno.dev/ai_agents", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // mode: "no-cors",
    });
    const data = await response.json();
    console.log("data:" + JSON.stringify(data));
    // const sampleData: AIAgent[] = [
    //   {
    //     id: 1,
    //     name: "Bodhi Hacker Helper",
    //     description:
    //       "I'm a Bodhi-based AI agent specializing in hackathon assistance.\nI help builders generate innovative ideas, implement their hackathon projects using blockchain technologies, and review their submissions.\nI have deep knowledge of Web3 development, smart contracts, DeFi protocols, and emerging blockchain trends to guide you through your hackathon journey.",
    //     contract_addr: "0x5B074757a1Ae77ac5d63a3292E4EC8E5C3A2EcB4",
    //     owner_addr: "0x73c7448760517E3E6e416b2c130E3c6dB2026A1d",
    //     bodhi_id: 15536,
    //     version: "v1.0.0",
    //     created_at: "2025-08-23T11:56:11.73053+00:00",
    //     updated_at: null,
    //     prompts: [15539],
    //     on_chain_knowledges: [15540],
    //     off_chain_knowledges: ["https://www.google.com"],
    //   },
    // ];

    // Sort function to prioritize items with 🔥 in name
  };

  useEffect(() => {
    init();
  }, []);
  return (
    <div className="grid lg:grid-cols-1 flex-grow">
      <div className="flex flex-col justify-center items-center bg-[url('/assets/gradient-bg.png')] bg-[length:100%_100%] py-10 px-5 sm:px-0 lg:py-auto max-w-[100vw] ">
        {/* <div className="hero min-h-screen bg-base-200 bg-gradient-to-r from-green-500 to-blue-500"> */}
        <div className="hero-content text-center">
          <div className="max-w-screen-xl">
            <h1 className="text-2xl font-bold">🫆 DimSum RightProof 🫆</h1>
            <p className="py-6"> 基于 Bodhi 协议，对数据进行链上存证、确权与代币化！</p>
            <h2 className="text-2xl font-bold mb-6"> 😎 Handle ur Dataset Step by Step! 😎</h2>
            {/* Step 1: Generate Data Hash */}
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Step 1: Generate Data Hash</h3>
              <h3 className="text-lg font-semibold mb-2">步骤 1:生成数据指纹</h3>
              <p className="mb-4">To generate a hash of your data, use one of these methods:</p>
              <div className="bg-black text-white p-4 rounded-md font-mono text-sm">
                {/* Linux/Mac */}
                <p className="mb-2"># For Linux/Mac:</p>
                <code>sha256sum [file_path]</code>
                <br />
                <br />
                {/* Windows */}
                <p className="mb-2"># For Windows PowerShell:</p>
                <code>Get-FileHash -Path [file_path] -Algorithm SHA256</code>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                The output hash will be used in the next step to create your on-chain copyright.
              </p>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">The Output For Example:</p>
              <div className="bg-black text-white p-4 rounded-md font-mono text-sm">
                <code>ab257c9a4b5c7b338514ee392e26f26d9a69c84146830e85ee587b407d0e336c dataset.zip</code>
              </div>
            </div>
            <div className="flex justify-center items-center my-8">
              <span className="text-6xl animate-bounce">⬇️</span>
            </div>
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Step 2: Select a License for Your Dataset</h3>
              <h3 className="text-lg font-semibold mb-2">步骤 2: 为数据集选择许可证</h3>

              <div className="form-control w-full max-w-lg mx-auto">
                <label className="label">
                  <span className="label-text">Choose a License Type:</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedLicense.id}
                  onChange={e => {
                    const newSelectedLicense = LICENSE_OPTIONS.find(license => license.id === e.target.value);
                    if (newSelectedLicense) {
                      setSelectedLicense(newSelectedLicense);
                    }
                  }}
                >
                  {LICENSE_OPTIONS.map(license => (
                    <option key={license.id} value={license.id}>
                      {license.name}
                    </option>
                  ))}
                </select>

                <div className="mt-6 space-y-4">
                  <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-2">
                    {selectedLicense.name}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <b>Usage Terms: &nbsp;&nbsp;</b>
                    {selectedLicense.usage}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <b>Profit Distribution: &nbsp;&nbsp;</b>
                    {selectedLicense.profit}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <b>See More Details: &nbsp;&nbsp;</b>
                    <a
                      href={`https://bodhi.wtf/${selectedLicense.bodhi_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline transition-all duration-200"
                    >
                      {`https://bodhi.wtf/${selectedLicense.bodhi_id}`} 🔗
                    </a>
                  </p>

                  {/* TODO: or, do you want to create license by yourself? */}
                </div>
              </div>
              <br></br>
              <a
                href={`/debug/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline transition-all duration-200"
              >
                或者，你想创建自己的 License?
              </a>
            </div>
            <div className="flex justify-center items-center my-8">
              <span className="text-6xl animate-bounce">⬇️</span>
            </div>
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Step 3: Fill in Dataset Information</h3>
              <h3 className="text-lg font-semibold mb-2">步骤 3: 填写数据集信息</h3>
              <p className="mb-4">
                这里是参考示例：
                <a
                  href="https://bodhi.wtf/space/5/15545"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline transition-all duration-200"
                >
                  https://bodhi.wtf/space/5/15545
                </a>
              </p>

              <div className="form-control w-full max-w-2xl mx-auto space-y-4">
                {/* Dataset Name */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Dataset Name / 数据集名称</span>
                    <span className="label-text-alt text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., My AI Training Dataset"
                    className="input input-bordered w-full"
                    value={datasetName}
                    onChange={e => setDatasetName(e.target.value)}
                  />
                </div>

                {/* Dataset Description */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Dataset Description / 数据集描述</span>
                    <span className="label-text-alt text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Describe your dataset in markdown format. Include details about the content, structure, and intended use..."
                    className="textarea textarea-bordered w-full h-32"
                    value={datasetDescription}
                    onChange={e => setDatasetDescription(e.target.value)}
                  />
                  <label className="label">
                    <span className="label-text-alt">支持 Markdown 格式</span>
                  </label>
                </div>

                {/* Dataset Hash */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Dataset Hash / 数据集哈希值</span>
                    <span className="label-text-alt text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., ab257c9a4b5c7b338514ee392e26f26d9a69c84146830e85ee587b407d0e336c"
                    className="input input-bordered w-full font-mono text-sm"
                    value={datasetHash}
                    onChange={e => setDatasetHash(e.target.value)}
                  />
                  <label className="label">
                    <span className="label-text-alt">从步骤 1 获取的 SHA256 哈希值</span>
                  </label>
                </div>

                {/* Tokenization Option */}
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={isTokenized}
                      onChange={e => setIsTokenized(e.target.checked)}
                    />
                    <span className="label-text font-semibold">Tokenize this dataset / 将此数据集代币化</span>
                  </label>
                  <label className="label">
                    <span className="label-text-alt text-gray-600 dark:text-gray-400">
                      代币化后，数据集可以被分割成份额进行交易，持有者可以获得收益分成
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">数据集链接（可选）</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., https://github.com/noncegeek/dataset-example"
                    className="input input-bordered w-full font-mono text-sm"
                    value={datasetLink}
                    onChange={e => setDatasetLink(e.target.value)}
                  />
                </div>

                {/* Summary Section */}
                <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-primary">
                  <h4 className="font-bold text-lg mb-3">📋 Summary / 摘要</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Name:</strong> {datasetName || <span className="text-gray-400">未填写</span>}
                    </p>
                    <p>
                      <strong>Description:</strong>{" "}
                      {datasetDescription ? (
                        <span className="block mt-1 text-gray-600 dark:text-gray-300">
                          {datasetDescription.slice(0, 100)}
                          {datasetDescription.length > 100 ? "..." : ""}
                        </span>
                      ) : (
                        <span className="text-gray-400">未填写</span>
                      )}
                    </p>
                    <p>
                      <strong>Hash:</strong>{" "}
                      {datasetHash ? (
                        <span className="font-mono text-xs break-all">{datasetHash}</span>
                      ) : (
                        <span className="text-gray-400">未填写</span>
                      )}
                    </p>
                    <p>
                      <strong>License:</strong>{" "}
                      <a
                        href={`https://bodhi.wtf/${selectedLicense.bodhi_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline transition-all duration-200"
                      >{`https://bodhi.wtf/${selectedLicense.bodhi_id}`}</a>
                    </p>
                    <p>
                      <strong>Tokenized:</strong> {isTokenized ? "true" : "false"}
                    </p>
                    <p>
                      <strong>Dataset Link:</strong>{" "}
                      {datasetLink ? (
                        <span className="font-mono text-xs break-all">{datasetLink}</span>
                      ) : (
                        <span className="text-gray-400">未填写</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-lg w-full mt-4"
                  disabled={!datasetName || !datasetDescription || !datasetHash}
                  onClick={copyAsMarkdown}
                >
                  {copied ? "✅ Copied!" : "📋 Copy as Markdown Text"}
                </button>

                {/* Submit Button */}
                <a
                  href={`https://bodhi.wtf/space/5/15545`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg w-full mt-4"
                >
                  <button disabled={!datasetName || !datasetDescription || !datasetHash}>
                    🚀 Create Dataset on Bodhi
                  </button>
                </a>
              </div>
            </div>
            <div className="flex justify-center items-center my-8">
              <span className="text-6xl animate-bounce">⬇️</span>
            </div>
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Step 4: Create Dataset NFT!</h3>
              <h3 className="text-lg font-semibold mb-2">步骤 4: 创建 Dataset NFT!</h3>

              {/* Bodhi ID */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Bodhi ID (可选)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 15545"
                  className="input input-bordered w-full"
                  value={bodhiId}
                  onChange={e => setBodhiId(e.target.value)}
                />
                <label className="label">
                  <span className="label-text-alt">请填写步骤 3 中生成的 Bodhi ID</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">NFT URI - 可以选择一张图片: </span>
                </label>

                {/* Image Selector Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {NFT_URI_OPTIONS.map((uri, index) => (
                    <div
                      key={uri}
                      className={`cursor-pointer rounded-lg overflow-hidden border-4 transition-all duration-200 ${
                        nftUri === uri ? "border-primary shadow-lg scale-105" : "border-gray-300 hover:border-primary"
                      }`}
                      onClick={() => setNFTUri(uri)}
                    >
                      <div className="relative aspect-square">
                        <Image src={uri} alt={`NFT Image ${index + 1}`} fill className="object-cover" />
                        {nftUri === uri && (
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom URI Input */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm">或者输入自定义 URI:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., https://node1.irys.xyz/..."
                    className="input input-bordered w-full font-mono text-sm"
                    value={nftUri}
                    onChange={e => setNFTUri(e.target.value)}
                  />
                </div>
              </div>

              <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                点击下方按钮，将在区块链上创建您的数据集 NFT，完成存证和确权。
              </p>

              <div className="form-control w-full max-w-2xl mx-auto">
                <button
                  className="btn btn-primary btn-lg w-full"
                  disabled={!datasetName || !datasetDescription || !datasetHash || isCreating}
                  onClick={handleCreateDataset}
                >
                  {isCreating ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Creating Dataset NFT...
                    </>
                  ) : (
                    <>🚀 Create Dataset NFT on Blockchain</>
                  )}
                </button>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <h4 className="font-bold text-sm mb-2">ℹ️ What will happen:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Your dataset will be minted as an NFT on the blockchain</li>
                    <li>The hash ensures immutable proof of your data</li>
                    <li>
                      License:{" "}
                      <a
                        href={`https://bodhi.wtf/${selectedLicense.bodhi_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedLicense.name}
                      </a>
                    </li>
                    {isTokenized && <li>✅ Dataset will be tokenized for fractional ownership</li>}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center my-8">
              <span className="text-6xl animate-bounce">⬇️</span>
            </div>
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Step 5: Check My Dataset NFT!</h3>
              <h3 className="text-lg font-semibold mb-2">步骤 5: 查看我创建的 Dataset NFT!</h3>
              <p className="mb-4">
                <a
                  href={`/dataset-gallery`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline transition-all duration-200"
                >
                  点击这里，查看我创建的 Dataset NFT.
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ETHSpace;
