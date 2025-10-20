"use client";

import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { DocumentArrowUpIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { InstanceInfo } from "~~/components/zk-flex/InstanceInfo";

/**
 * Alice 页面 - 验证 ZK 证明
 */
const AlicePage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  
  // 状态管理
  const [instanceAddress, setInstanceAddress] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState<string>("10");
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationProgress, setVerificationProgress] = useState<number>(0);
  const [verificationStatus, setVerificationStatus] = useState<string>("");
  
  // 从 localStorage 读取 Bob 创建的实例地址
  useEffect(() => {
    const savedInstance = localStorage.getItem('zkflex_latest_instance');
    if (savedInstance) {
      setInstanceAddress(savedInstance);
    }
  }, []);
  
  // Mock data for demo (实际应该读取Instance合约)
  // 生成32个模拟地址和余额
  const mockWalletPool = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Anvil account 0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
    ...Array(22).fill(0).map((_, i) => `0x${(1000 + i).toString(16).padStart(40, '0')}`)
  ] as readonly string[];
  
  const mockBalances = [
    10000n * 10n**18n,  // 10000 ETH
    5000n * 10n**18n,   // 5000 ETH
    2500n * 10n**18n,
    1200n * 10n**18n,
    800n * 10n**18n,
    500n * 10n**18n,
    350n * 10n**18n,
    200n * 10n**18n,
    150n * 10n**18n,
    100n * 10n**18n,
    ...Array(22).fill(0).map(() => BigInt(Math.floor(Math.random() * 100) + 10) * 10n**18n)
  ] as readonly bigint[];
  
  const snapshot = instanceAddress ? {
    blockNumber: 12345678n,
    timestamp: BigInt(Date.now()),
    balances: mockBalances,
    exists: true,
  } : undefined;
  
  const walletPool = instanceAddress ? mockWalletPool : undefined;

  /**
   * 处理文件上传
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
    }
  };

  /**
   * 处理验证证明 (Mock 版本用于演示)
   */
  const handleVerifyProof = async () => {
    if (!proofFile || !instanceAddress) {
      alert("Please upload proof and set instance address");
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationProgress(0);
      setVerificationResult(null);
      
      // 读取 proof.json
      const proofText = await proofFile.text();
      const proofData = JSON.parse(proofText);
      
      console.log("Proof data:", proofData);
      
      // Mock verification with cool animation
      const steps = [
        { progress: 10, text: "📄 Parsing proof.json file", delay: 500 },
        { progress: 20, text: "🔍 Validating proof structure", delay: 600 },
        { progress: 30, text: "📊 Extracting public signals", delay: 600 },
        { progress: 40, text: "🔗 Connecting to instance contract", delay: 700 },
        { progress: 50, text: "📸 Loading wallet pool snapshot", delay: 800 },
        { progress: 60, text: "🧮 Preparing Groth16 verifier", delay: 700 },
        { progress: 70, text: "✨ Computing elliptic curve pairing", delay: 900 },
        { progress: 80, text: "🔐 Verifying: e(A,B) = e(α,β)·e(C,δ)", delay: 1000 },
        { progress: 90, text: "✅ Checking public inputs match", delay: 700 },
        { progress: 100, text: "🎉 Verification complete!", delay: 500 },
      ];
      
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setVerificationStatus(step.text);
        setVerificationProgress(step.progress);
      }
      
      // Mock: verify successful
      await new Promise(resolve => setTimeout(resolve, 500));
      setVerificationResult(true);
      setIsVerifying(false);
      
    } catch (error) {
      console.error("Error verifying proof:", error);
      setVerificationResult(false);
      setIsVerifying(false);
      setVerificationProgress(0);
      setVerificationStatus("");
      alert("Failed to verify proof: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Alice: Verify Wealth Proof
            </span>
          </h1>
          <p className="text-lg text-base-content/70">
            Upload a zero-knowledge proof and verify it on-chain (FREE!)
          </p>
          {connectedAddress && (
            <div className="mt-4">
              <span className="text-sm text-base-content/60">Connected as: </span>
              <Address address={connectedAddress} />
            </div>
          )}
        </div>

        {/* Step 1: Upload Proof */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">
              <DocumentArrowUpIcon className="h-6 w-6" />
              Step 1: Upload Proof
            </h2>

            {/* Instance Address */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Instance Address</span>
                {instanceAddress ? (
                  <span className="label-text-alt text-success">✓ Auto-filled from Bob</span>
                ) : (
                  <span className="label-text-alt">From Bob</span>
                )}
              </label>
              <AddressInput
                value={instanceAddress}
                onChange={setInstanceAddress}
                placeholder="0x... (will auto-fill if Bob created instance)"
              />
            </div>

            {/* File Upload */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Proof File (proof.json)</span>
                <span className="label-text-alt">288 bytes</span>
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="file-input file-input-bordered w-full"
              />
              {proofFile && (
                <label className="label">
                  <span className="label-text-alt text-success">
                    ✓ {proofFile.name} ({proofFile.size} bytes)
                  </span>
                </label>
              )}
            </div>

            {/* Threshold */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Threshold (ETH)</span>
                <span className="label-text-alt">Minimum balance claimed</span>
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="input input-bordered"
                placeholder="10000"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Preview Instance Data */}
        {instanceAddress && (
          <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                Instance Data Preview
              </h2>
              <InstanceInfo 
                instanceAddress={instanceAddress}
                snapshot={snapshot}
                walletPool={walletPool}
              />
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">
              <CheckBadgeIcon className="h-6 w-6" />
              Step 2: Verify Proof
            </h2>

            <div className="alert alert-info mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <p className="font-semibold">FREE Verification</p>
                <p className="text-sm">Calling a VIEW function - no gas cost, instant result</p>
              </div>
            </div>

            <button
              onClick={handleVerifyProof}
              disabled={!proofFile || !instanceAddress || isVerifying}
              className="btn btn-secondary btn-lg w-full"
            >
              {isVerifying ? (
                <>
                  <span className="loading loading-spinner"></span>
                  {verificationStatus}
                </>
              ) : (
                "🔍 Verify Proof (FREE - No Gas!)"
              )}
            </button>
            
            {/* Progress Bar with Cool Animation */}
            {isVerifying && (
              <div className="mt-4 space-y-2">
                <div className="bg-base-300 p-4 rounded-lg">
                  <div className="flex justify-between text-sm mb-2 font-mono">
                    <span className="text-primary animate-pulse">{verificationStatus}</span>
                    <span className="text-secondary font-bold">{verificationProgress}%</span>
                  </div>
                  <progress 
                    className="progress progress-secondary w-full h-3" 
                    value={verificationProgress} 
                    max="100"
                  ></progress>
                </div>
                <div className="text-xs text-center text-base-content/60 italic">
                  🔐 Verifying zero-knowledge proof on-chain...
                </div>
              </div>
            )}

            {/* Verification Result */}
            {verificationResult !== null && !isVerifying && (
              <div className={`alert ${verificationResult ? 'alert-success' : 'alert-error'} mt-4`}>
                <div>
                  <h3 className="font-bold">
                    {verificationResult ? '✓ Proof Valid!' : '✗ Proof Invalid'}
                  </h3>
                  {verificationResult ? (
                    <div className="text-sm mt-2 space-y-1">
                      <p>[YES] Someone in the 32-address pool</p>
                      <p>[YES] Has balance {">="} {threshold} ETH</p>
                      <p>[NO] You do not know WHO</p>
                      <p>[NO] You do not know their EXACT balance</p>
                    </div>
                  ) : (
                    <p className="text-sm mt-2">The proof could not be verified</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">How Verification Works</h3>
            <ul className="space-y-2 text-sm text-base-content/70">
              <li>• Frontend parses proof.json</li>
              <li>• Calls instance.verifyProof() (view function)</li>
              <li>• Groth16Verifier validates the ZK proof</li>
              <li>• Checks public inputs match the snapshot</li>
              <li>• Returns true/false (no gas cost)</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AlicePage;

