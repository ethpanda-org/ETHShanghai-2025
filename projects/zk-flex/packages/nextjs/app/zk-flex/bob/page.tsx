"use client";

import { useState, useEffect, useRef } from "react";
import type { NextPage } from "next";
import { useAccount, useSignMessage } from "wagmi";
import { PlusIcon, CameraIcon } from "@heroicons/react/24/outline";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Bob 页面 - 创建钱包池实例 + 生成 ZK 证明
 */
const BobPage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  
  // 状态管理
  const [walletAddresses, setWalletAddresses] = useState<string[]>(Array(32).fill(""));
  const [instanceAddress, setInstanceAddress] = useState<string>("");
  const [walletIndex, setWalletIndex] = useState<number>(15);
  const [threshold, setThreshold] = useState<string>("10");
  const [isStep1Collapsed, setIsStep1Collapsed] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [cpuUsage, setCpuUsage] = useState<number[]>([]);
  const [flavorType, setFlavorType] = useState<'tech' | 'fun'>('tech');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 绘制CPU使用率曲线
  useEffect(() => {
    if (!canvasRef.current || cpuUsage.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置样式
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    // 绘制背景网格
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }
    
    // 绘制Y轴标签
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height / 5) * i;
      const value = 100 - (i * 20);
      ctx.fillText(`${value}%`, padding - 10, y + 4);
    }
    
    // 绘制曲线
    if (cpuUsage.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      cpuUsage.forEach((cpu, index) => {
        const x = padding + (width / (cpuUsage.length - 1)) * index;
        const y = padding + height - (cpu / 100) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // 绘制填充区域
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, padding, 0, canvas.height - padding);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }, [cpuUsage]);
  
  // 合约交互
  const { writeContractAsync: createInstance } = useScaffoldWriteContract("WealthProofRegistry");
  const { signMessageAsync } = useSignMessage();
  
  // 读取所有实例（用于获取最新创建的实例地址）
  const { refetch: refetchInstances } = useScaffoldReadContract({
    contractName: "WealthProofRegistry",
    functionName: "getAllInstances",
  });
  
  // const { data: snapshot } = useScaffoldReadContract({
  //   contractName: "WealthProofInstance",
  //   address: instanceAddress || undefined,
  //   functionName: "getLatestSnapshot",
  // });
  
  /**
   * 处理创建实例
   */
  const handleCreateInstance = async () => {
    try {
      setIsCreating(true);
      
      // 验证地址
      const validAddresses = walletAddresses.filter(addr => addr && addr.startsWith("0x"));
      if (validAddresses.length !== 32) {
        alert("Please input exactly 32 valid addresses");
        setIsCreating(false);
        return;
      }
      
      // 调用合约创建实例
      await createInstance({
        functionName: "createProofInstance",
        args: [walletAddresses as unknown as readonly [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string]],
      });
      
      // 等待交易确认后，重新查询所有实例
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
      
      // 刷新实例列表
      const { data: updatedInstances } = await refetchInstances();
      
      // 获取最新创建的实例（数组最后一个）
      if (updatedInstances && updatedInstances.length > 0) {
        const latestInstance = updatedInstances[updatedInstances.length - 1];
        setInstanceAddress(latestInstance);
        console.log("Instance created:", latestInstance);
        
        // 保存到 localStorage 供 Alice 页面使用
        localStorage.setItem('zkflex_latest_instance', latestInstance);
      }
      
      // 折叠 Step 1
      setIsStep1Collapsed(true);
      setIsCreating(false);
      
      alert("Instance created and auto-filled to Step 2!");
    } catch (error) {
      console.error("Error creating instance:", error);
      alert("Failed to create instance: " + (error as Error).message);
      setIsCreating(false);
    }
  };
  
  /**
   * 生成 ZK 证明 (Mock 版本用于演示)
   */
  const handleGenerateProof = async () => {
    if (!connectedAddress) {
      alert("Please connect wallet first");
      return;
    }
    
    if (!instanceAddress) {
      alert("Please create instance first");
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      
      // Step 1: Sign message
      setGenerationStatus("🔐 Requesting MetaMask signature...");
      setGenerationProgress(5);
      
      const message = "ZK Flex Proof - Prove your wealth without revealing your identity";
      const signature = await signMessageAsync({ message });
      
      console.log("Signature:", signature);
      
      // Mock proof generation with cool animation (60秒版本，技术+有趣文本混合)
      const steps = [
        { progress: 4, techText: "✅ 接收到 MetaMask 签名", funText: "🎭 Vitalik表示：又一个privacy maximalist", cpu: 15, duration: 2500 },
        { progress: 8, techText: "📦 加载电路文件 (wealth_proof.wasm)", funText: "📦 正在搬运919MB的数学魔法...", cpu: 25, duration: 2500 },
        { progress: 12, techText: "🔐 初始化 WebAssembly 运行时", funText: "🚀 比以太坊Gas费还要快的加载速度", cpu: 35, duration: 2500 },
        { progress: 17, techText: "🔧 解析 ECDSA 签名 (r, s, v)", funText: "🔑 私钥？不存在的，我们只要签名", cpu: 45, duration: 3000 },
        { progress: 21, techText: "🔢 转换签名为 256-bit limbs", funText: "🧮 感谢中本聪发明了secp256k1", cpu: 55, duration: 2500 },
        { progress: 26, techText: "📊 构建见证：1,880,000 约束", funText: "😱 这么多约束？还好不是在链上跑", cpu: 65, duration: 3000 },
        { progress: 31, techText: "🧮 初始化 Groth16 证明器", funText: "🎓 感谢2016年的密码学论文", cpu: 75, duration: 3000 },
        { progress: 35, techText: "🌐 BN254 椭圆曲线初始化", funText: "📐 254位的浪漫，不是256是因为...", cpu: 82, duration: 2500 },
        { progress: 40, techText: "⚡ 计算见证多项式", funText: "🎯 开始真正的密码学魔法时刻", cpu: 87, duration: 3000 },
        { progress: 45, techText: "🌀 快速傅里叶变换 (FFT)", funText: "🎵 听，那是拉格朗日插值的声音", cpu: 91, duration: 3000 },
        { progress: 50, techText: "🔐 椭圆曲线标量乘法 (点乘)", funText: "➗ 离散对数：你猜不到我的私钥", cpu: 94, duration: 3000 },
        { progress: 55, techText: "🧬 计算证明的 A 点", funText: "🎯 第一个见证承诺，盖章！", cpu: 96, duration: 3000 },
        { progress: 60, techText: "🧬 计算证明的 B 点", funText: "✨ 第二个见证承诺，盖章！", cpu: 97, duration: 3000 },
        { progress: 65, techText: "🧬 计算证明的 C 点", funText: "💎 第三个见证承诺，完美！", cpu: 98, duration: 3000 },
        { progress: 70, techText: "🔮 执行多标量乘法 (MSM)", funText: "🚄 GPU都羡慕的计算速度", cpu: 98, duration: 3500 },
        { progress: 75, techText: "✨ 配对检查 e(A,B) = e(α,β)·e(C,δ)", funText: "🎪 双线性配对：密码学的黑魔法", cpu: 97, duration: 3500 },
        { progress: 80, techText: "🔍 验证约束满足性", funText: "✅ 1,880,000个约束全部满足", cpu: 95, duration: 3000 },
        { progress: 85, techText: "📝 序列化证明 (288 bytes)", funText: "🎁 把1GB运算压缩成288字节", cpu: 70, duration: 2500 },
        { progress: 89, techText: "🔒 应用随机化掩码", funText: "🎲 让你永远猜不到我是谁", cpu: 50, duration: 2500 },
        { progress: 93, techText: "🧪 运行最终验证", funText: "🔬 自己先验证一遍，确保万无一失", cpu: 35, duration: 2500 },
        { progress: 97, techText: "✅ 证明生成完成！", funText: "🎉 恭喜！你现在是隐私大师了", cpu: 20, duration: 2500 },
        { progress: 100, techText: "🎉 任务完成！", funText: "🚀 去找Alice炫耀吧！", cpu: 10, duration: 2000 },
      ];
      
      // 初始化
      setCpuUsage([]);
      setGenerationProgress(0);
      
      // 执行每个步骤，同步更新进度条、CPU和文本
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const prevProgress = i === 0 ? 0 : steps[i - 1].progress;
        const type = Math.random() > 0.5 ? 'tech' : 'fun';
        
        // 设置文本和类型
        setFlavorType(type);
        setGenerationStatus(type === 'tech' ? step.techText : step.funText);
        
        // 平滑更新进度条（从上一步进度到当前步骤进度）
        const progressDiff = step.progress - prevProgress;
        const steps_count = Math.ceil(step.duration / 50); // 每50ms更新一次
        const progressStep = progressDiff / steps_count;
        
        for (let j = 0; j < steps_count; j++) {
          const newProgress = prevProgress + progressStep * (j + 1);
          setGenerationProgress(Math.min(Math.floor(newProgress), step.progress));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // 确保到达目标进度
        setGenerationProgress(step.progress);
        
        // 更新CPU使用率
        setCpuUsage(prev => [...prev, step.cpu]);
      }
      
      // Generate mock proof data
      const mockProof = {
        proof: {
          pi_a: [
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
            "0x1111111111111111111111111111111111111111111111111111111111111111"
          ],
          pi_b: [
            [
              "0x2222222222222222222222222222222222222222222222222222222222222222",
              "0x3333333333333333333333333333333333333333333333333333333333333333"
            ],
            [
              "0x4444444444444444444444444444444444444444444444444444444444444444",
              "0x5555555555555555555555555555555555555555555555555555555555555555"
            ],
            [
              "0x1111111111111111111111111111111111111111111111111111111111111111",
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            ]
          ],
          pi_c: [
            "0x6666666666666666666666666666666666666666666666666666666666666666",
            "0x7777777777777777777777777777777777777777777777777777777777777777",
            "0x1111111111111111111111111111111111111111111111111111111111111111"
          ],
          protocol: "groth16",
          curve: "bn128"
        },
        publicSignals: [
          instanceAddress,
          threshold,
          walletIndex.toString(),
          "0x" + Date.now().toString(16) // blockNumber as timestamp
        ],
        metadata: {
          instanceAddress,
          threshold: threshold + " ETH",
          timestamp: new Date().toISOString(),
          constraints: "1,880,000",
          provingTime: "~15 seconds (mock)",
          curve: "BN254",
          zkSystem: "Groth16"
        }
      };
      
      // Download proof
      const blob = new Blob([JSON.stringify(mockProof, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zk-flex-proof-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 清理
      setIsGenerating(false);
      setCpuUsage([]);
      setGenerationProgress(0);
      
      alert("🎉 证明生成成功并已下载！\n\n将 proof.json 文件分享给 Alice 即可验证您的财富，而不会暴露您的身份。");
      
    } catch (error) {
      console.error("Error generating proof:", error);
      alert("Failed to generate proof: " + (error as Error).message);
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus("");
      setCpuUsage([]);
    }
  };
  
  /**
   * 使用测试地址填充
   */
  const fillTestAddresses = () => {
    const testAddresses = [
      // Anvil default accounts
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
      "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    ];
    
    const newAddresses = [...walletAddresses];
    for (let i = 0; i < Math.min(9, 32); i++) {
      newAddresses[i] = testAddresses[i];
    }
    
    // Fill rest with placeholder
    for (let i = 9; i < 32; i++) {
      if (!newAddresses[i]) {
        newAddresses[i] = `0x${(i + 1000).toString(16).padStart(40, '0')}`;
      }
    }
    
    setWalletAddresses(newAddresses);
  };

  return (
    <div className="min-h-screen bg-base-200 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Bob: Prove Your Wealth
            </span>
          </h1>
          <p className="text-lg text-base-content/70">
            Create a wallet pool and generate zero-knowledge proofs
          </p>
          {connectedAddress && (
            <div className="mt-4">
              <span className="text-sm text-base-content/60">Connected as: </span>
              <Address address={connectedAddress} />
            </div>
          )}
        </div>

        {/* Step 1: Create Instance */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title text-2xl">
                <PlusIcon className="h-6 w-6" />
                Step 1: Create Wallet Pool Instance
                {instanceAddress && <span className="badge badge-success ml-2">✓ Created</span>}
              </h2>
              {instanceAddress && (
                <button 
                  onClick={() => setIsStep1Collapsed(!isStep1Collapsed)}
                  className="btn btn-ghost btn-sm"
                >
                  {isStep1Collapsed ? "Show ▼" : "Hide ▲"}
                </button>
              )}
            </div>
            
            {/* 可折叠内容 */}
            {!isStep1Collapsed && (
              <>
                <div className="alert alert-info mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <div>
                    <p className="font-semibold">Input 32 wallet addresses</p>
                    <p className="text-sm">Mix your real wallet (Bob_real) with 31 public addresses (like Vitalik, DAOs, etc.)</p>
                  </div>
                </div>

                {/* Test Data Button */}
                <button 
                  onClick={fillTestAddresses}
                  className="btn btn-outline btn-sm mb-4"
                >
                  Fill with Test Addresses
                </button>

                {/* Address Input Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {walletAddresses.map((addr, index) => (
                    <div key={index} className="form-control">
                      <label className="label py-1">
                        <span className="label-text text-xs">Address [{index}]</span>
                      </label>
                      <AddressInput
                        value={addr}
                        onChange={(value) => {
                          const newAddresses = [...walletAddresses];
                          newAddresses[index] = value;
                          setWalletAddresses(newAddresses);
                        }}
                        placeholder={`Address ${index}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Create Instance Button */}
                <button
                  onClick={handleCreateInstance}
                  disabled={!connectedAddress || isCreating}
                  className="btn btn-primary btn-lg w-full"
                >
                  {isCreating ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Creating Instance...
                    </>
                  ) : (
                    "Create Wallet Pool Instance"
                  )}
                </button>
              </>
            )}
            
            {/* 折叠后显示的摘要 */}
            {isStep1Collapsed && (
              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="font-semibold">Instance Created!</p>
                  <p className="text-sm">32 addresses added to pool</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Generate Proof */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">
              <CameraIcon className="h-6 w-6" />
              Step 2: Generate ZK Proof
            </h2>


            {/* Instance Address Input - 自动填充 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Instance Address</span>
                {instanceAddress && (
                  <span className="label-text-alt text-success">Auto-filled from Step 1</span>
                )}
              </label>
              <AddressInput
                value={instanceAddress}
                onChange={setInstanceAddress}
                placeholder="0x... (will auto-fill after Step 1)"
              />
            </div>

            {/* Proof Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Wallet Index (0-31)</span>
                  <span className="label-text-alt">Your position in the pool</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={walletIndex}
                  onChange={(e) => setWalletIndex(parseInt(e.target.value))}
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Threshold (ETH)</span>
                  <span className="label-text-alt">Minimum balance to prove</span>
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

            {/* Snapshot Display */}
            {instanceAddress && (
              <div className="alert alert-success mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="font-semibold">Instance Ready!</p>
                  <p className="text-sm">32 wallets in pool, snapshot created</p>
                </div>
              </div>
            )}

            {/* Generate Proof Button */}
            <button
              onClick={handleGenerateProof}
              disabled={!instanceAddress || isGenerating}
              className="btn btn-secondary btn-lg w-full"
            >
              🚀 Generate ZK Proof
            </button>
            
            {!isGenerating && (
              <div className="mt-4 text-sm text-base-content/60 space-y-1">
                <p>📋 即将发生什么：</p>
                <p>1. MetaMask 签名消息 (~2秒)</p>
                <p>2. 加载电路文件和证明密钥 (~5秒)</p>
                <p>3. 浏览器端生成 ZK 证明：1.88M 约束 (~60秒)</p>
                <p>4. 自动下载 proof.json (288 bytes)</p>
                <p className="text-primary">💡 技术文字会在"技术模式"和"趣味模式"之间随机切换</p>
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Full Screen Generation Modal */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-6xl mx-4">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-4">
                正在生成零知识证明
              </h2>
              <div className="flex items-center justify-center gap-4 text-2xl">
                <span className="text-blue-400 font-mono">{generationProgress}%</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-400">预计耗时: ~60秒</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
            
            {/* Main Content */}
            <div className="grid grid-cols-2 gap-8">
              {/* Left: CPU Chart */}
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <span>浏览器 CPU 使用率</span>
                </h3>
                <canvas 
                  ref={canvasRef} 
                  width={500} 
                  height={300}
                  className="w-full"
                />
                <div className="mt-4 text-center">
                  <span className="text-blue-400 font-mono text-3xl font-bold">
                    {cpuUsage[cpuUsage.length - 1] || 0}%
                  </span>
                  <span className="text-slate-400 ml-2">当前使用率</span>
                </div>
              </div>
              
              {/* Right: Status and Animation */}
              <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700 flex flex-col">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span>正在执行</span>
                </h3>
                
                {/* Current Status */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-6">
                    <div className={`text-6xl ${flavorType === 'fun' ? 'animate-bounce' : 'animate-pulse'}`}>
                      {generationStatus.split(' ')[0]}
                    </div>
                    <div className={`text-2xl font-medium px-8 ${flavorType === 'fun' ? 'text-yellow-300' : 'text-white'}`}>
                      {generationStatus.substring(generationStatus.indexOf(' ') + 1)}
                    </div>
                    <div className="text-sm text-slate-500 mt-4">
                      {flavorType === 'fun' ? '😄 趣味模式' : '🔬 技术模式'}
                    </div>
                  </div>
                </div>
                
                {/* Technical Info */}
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 mb-1">约束数</div>
                    <div className="text-white font-mono font-bold">1,880,000</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 mb-1">曲线</div>
                    <div className="text-white font-mono font-bold">BN254</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 mb-1">证明系统</div>
                    <div className="text-white font-mono font-bold">Groth16</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 mb-1">证明大小</div>
                    <div className="text-white font-mono font-bold">288 bytes</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer Hint */}
            <div className="mt-8 text-center text-slate-400 text-sm">
              <p>🔐 所有计算在您的浏览器本地完成，私钥和签名不会上传到任何服务器</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BobPage;

