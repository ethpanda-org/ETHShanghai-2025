import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// 不需要私钥的只读诊断
async function main() {
  console.log("🔍 开始诊断 Sepolia 部署状态（只读模式）...\n");

  // 使用公共 RPC
  const provider = new ethers.JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.public.blastapi.io"
  );

  const addresses = {
    FxUSD: "0x085a1b6da46ae375b35dea9920a276ef571e209c",
    PoolManager: "0xbb644076500ea106d9029b382c4d49f56225cb82",
    FxUSDBasePool: "0x420D6b8546F14C394A703F5ac167619760A721A9",
    PegKeeper: "0x628648849647722144181c9CB5bbE0CCadd50029",
    AaveFundingPool: "0xAb20B978021333091CA307BB09E022Cec26E8608",
    AaveFundingPoolImpl: "0x33263fF0D348427542ee4dBF9069d411ac43718E",
    ReservePool: "0x3908720b490a2368519318dD15295c22cd494e34",
    RevenuePool: "0x54AC8d19ffc522246d9b87ED956de4Fa0590369A",
    PoolConfiguration: "0x35456038942C91eb16fe2E33C213135E75f8d188",
    ProxyAdmin: "0x7bc6535d75541125fb3b494decfde10db20c16d8",
    MultiPathConverter: "0x5Df050be8141f1e6C1E9129E1e51E7e7bFd2e52B",
  };

  // ============ 检查合约代码是否存在 ============
  console.log("═══════════════════════════════════════");
  console.log("📦 检查合约部署状态");
  console.log("═══════════════════════════════════════\n");

  for (const [name, address] of Object.entries(addresses)) {
    try {
      const checksummedAddress = ethers.getAddress(address);
      const code = await provider.getCode(checksummedAddress);
      const exists = code !== "0x";
      console.log(`${exists ? '✅' : '❌'} ${name.padEnd(25)} ${checksummedAddress}`);
    } catch (e) {
      console.log(`❌ ${name.padEnd(25)} Invalid address: ${address}`);
    }
  }

  // ============ 检查 PoolManager ============
  console.log("\n═══════════════════════════════════════");
  console.log("📊 PoolManager 详细检查");
  console.log("═══════════════════════════════════════\n");

  const poolManagerAbi = [
    "function configuration() view returns (address)",
    "function counterparty() view returns (address)",
    "function fxUSD() view returns (address)",
    "function fxBASE() view returns (address)",
    "function getPoolInfo(address) view returns (tuple(address rewarder, address gauge, uint256 collateralCapacity, uint256 debtCapacity))",
    "function hasRole(bytes32,address) view returns (bool)",
  ];

  try {
    const poolManager = new ethers.Contract(addresses.PoolManager, poolManagerAbi, provider);

    const configuration = await poolManager.configuration();
    console.log("✓ Configuration:", configuration);
    console.log("  ", configuration === ethers.ZeroAddress ? "❌ 未设置" : configuration === addresses.PoolConfiguration ? "✅ 正确" : "⚠️  地址不匹配");

    const counterparty = await poolManager.counterparty();
    console.log("✓ Counterparty:", counterparty);
    console.log("  ", counterparty === addresses.PegKeeper ? "✅ 正确" : "❌ 不正确");

    const fxUSD = await poolManager.fxUSD();
    console.log("✓ fxUSD:", fxUSD);
    console.log("  ", fxUSD === addresses.FxUSD ? "✅ 正确" : "❌ 不正确");

    const fxBASE = await poolManager.fxBASE();
    console.log("✓ fxBASE:", fxBASE);
    console.log("  ", fxBASE === addresses.FxUSDBasePool ? "✅ 正确" : "❌ 不正确");

    // 检查 AaveFundingPool 注册状态
    try {
      const poolInfo = await poolManager.getPoolInfo(addresses.AaveFundingPool);
      console.log("\n✓ AaveFundingPool 注册信息:");
      console.log("  - Rewarder:", poolInfo.rewarder);
      console.log("  - Gauge:", poolInfo.gauge);
      console.log("  - Collateral Capacity:", ethers.formatUnits(poolInfo.collateralCapacity, 6), "USDC");
      console.log("  - Debt Capacity:", ethers.formatEther(poolInfo.debtCapacity), "fxUSD");
    } catch (e: any) {
      console.log("❌ AaveFundingPool 未注册");
    }

  } catch (e: any) {
    console.log("❌ PoolManager 检查失败:", e.message);
  }

  // ============ 检查 AaveFundingPool ============
  console.log("\n═══════════════════════════════════════");
  console.log("🏦 AaveFundingPool 详细检查");
  console.log("═══════════════════════════════════════\n");

  const aavePoolAbi = [
    "function priceOracle() view returns (address)",
    "function getPrice() view returns (uint256, bool)",
    "function getPoolParameters() view returns (tuple(uint256 openRatio, uint256 openRatioStep, uint256 closeFeeRatio, uint256 fundingRatio))",
    "function getDebtRatioRange() view returns (uint256, uint256)",
    "function canBorrow() view returns (bool)",
    "function canRedeem() view returns (bool)",
    "function collateral() view returns (address)",
  ];

  try {
    const aavePool = new ethers.Contract(addresses.AaveFundingPool, aavePoolAbi, provider);

    const collateral = await aavePool.collateral();
    console.log("✓ 抵押品:", collateral);

    const oracle = await aavePool.priceOracle();
    console.log("✓ Price Oracle:", oracle);

    if (oracle === ethers.ZeroAddress) {
      console.log("  ❌ 严重问题: Price Oracle 未设置!");
      console.log("  这可能是导致开仓失败的主要原因");
    } else {
      // 尝试获取价格
      try {
        const [price, valid] = await aavePool.getPrice();
        console.log("  ✓ 当前价格:", ethers.formatEther(price));
        console.log("  ✓ 价格有效:", valid ? "✅" : "❌");
      } catch (e: any) {
        console.log("  ❌ 无法获取价格:", e.message);
        console.log("  这可能导致开仓失败");
      }
    }

    const params = await aavePool.getPoolParameters();
    console.log("\n✓ 池子参数:");
    console.log("  - Open Ratio:", ethers.formatEther(params.openRatio));
    console.log("  - Open Ratio Step:", ethers.formatEther(params.openRatioStep));
    console.log("  - Close Fee:", ethers.formatUnits(params.closeFeeRatio, 9));
    console.log("  - Funding Ratio:", ethers.formatUnits(params.fundingRatio, 9));

    const [lower, upper] = await aavePool.getDebtRatioRange();
    console.log("\n✓ Debt Ratio 范围:");
    console.log("  - Lower:", ethers.formatEther(lower));
    console.log("  - Upper:", ethers.formatEther(upper));

    const canBorrow = await aavePool.canBorrow();
    const canRedeem = await aavePool.canRedeem();
    console.log("\n✓ 借贷状态:");
    console.log("  - Can Borrow:", canBorrow ? "✅" : "❌");
    console.log("  - Can Redeem:", canRedeem ? "✅" : "❌");

  } catch (e: any) {
    console.log("❌ AaveFundingPool 检查失败:", e.message);
  }

  // ============ 检查 PoolConfiguration ============
  console.log("\n═══════════════════════════════════════");
  console.log("⚙️  PoolConfiguration 检查");
  console.log("═══════════════════════════════════════\n");

  const poolConfigAbi = [
    "function fxUSDPriceOracle() view returns (address)",
    "function fxBasePool() view returns (address)",
    "function get(bytes32) view returns (address)",
  ];

  try {
    const poolConfig = new ethers.Contract(addresses.PoolConfiguration, poolConfigAbi, provider);

    const fxUSDPriceOracle = await poolConfig.fxUSDPriceOracle();
    console.log("✓ fxUSD Price Oracle:", fxUSDPriceOracle);
    console.log("  ", fxUSDPriceOracle === ethers.ZeroAddress ? "❌ 未设置" : "✅ 已设置");

    const fxBasePool = await poolConfig.fxBasePool();
    console.log("✓ fxBasePool:", fxBasePool);
    console.log("  ", fxBasePool === addresses.FxUSDBasePool ? "✅ 正确" : "❌ 不正确");

    // 检查注册的 Treasury
    try {
      const poolRewardsTreasury = ethers.id("PoolRewardsTreasury");
      const treasury = await poolConfig.get(poolRewardsTreasury);
      console.log("✓ PoolRewardsTreasury:", treasury);
      console.log("  ", treasury === ethers.ZeroAddress ? "❌ 未注册" : "✅ 已注册");
    } catch (e) {
      console.log("❌ PoolRewardsTreasury 未注册");
    }

  } catch (e: any) {
    console.log("❌ PoolConfiguration 检查失败:", e.message);
  }

  // ============ 检查主网合约是否存在于 Sepolia ============
  console.log("\n═══════════════════════════════════════");
  console.log("🔎 检查主网部署但 Sepolia 可能缺失的合约");
  console.log("═══════════════════════════════════════\n");

  const mainnetContracts = {
    "Router (Diamond)": "0x33636D49FbefBE798e15e7F356E8DBef543CC708",
    "StETHPriceOracle": "0x3716352d57C2e48EEdB56Ee0712Ef29E0c2f3069",
    "WstETHPool": "0x6Ecfa38FeE8a5277B91eFdA204c235814F0122E8",
  };

  const missingContracts: string[] = [];

  for (const [name, mainnetAddr] of Object.entries(mainnetContracts)) {
    const code = await provider.getCode(mainnetAddr);
    const exists = code !== "0x";
    
    if (exists) {
      console.log(`✅ ${name.padEnd(25)} 已存在`);
    } else {
      console.log(`❌ ${name.padEnd(25)} 未部署`);
      missingContracts.push(name);
    }
  }

  // ============ 诊断总结 ============
  console.log("\n═══════════════════════════════════════");
  console.log("📋 诊断总结与建议");
  console.log("═══════════════════════════════════════\n");

  console.log("🎯 关键发现:");
  console.log("1. PoolConfiguration:", addresses.PoolConfiguration === "0x35456038942C91eb16fe2E33C213135E75f8d188" ? "✅ 已部署" : "❌ 需要部署");
  console.log("2. 缺失的主网合约数量:", missingContracts.length);
  
  if (missingContracts.length > 0) {
    console.log("\n❌ 缺失的合约:");
    missingContracts.forEach(contract => console.log(`   - ${contract}`));
  }

  console.log("\n📝 建议的部署优先级:");
  console.log("\n🔥🔥🔥 最高优先级（必须）:");
  console.log("  1. 检查并修复 AaveFundingPool 的 Price Oracle");
  console.log("  2. 确保 PoolConfiguration 正确配置");
  console.log("  3. 验证所有角色权限");

  console.log("\n🔥🔥 高优先级（强烈推荐）:");
  console.log("  4. 部署 Router (Diamond Proxy) - 改善用户体验");
  console.log("  5. 部署 StETHPriceOracle - 支持 wstETH");

  console.log("\n🔥 中优先级（可选）:");
  console.log("  6. 部署 WstETHPool - 扩展功能");
  console.log("  7. 部署短仓系统 - 完整功能");

  console.log("\n⚠️  特别提醒:");
  console.log("  - Sepolia 测试网与主网的外部依赖不同（Chainlink, Curve 等）");
  console.log("  - 可能需要使用 Mock 合约替代某些外部依赖");
  console.log("  - 建议先修复当前部署的问题，再扩展新功能");

  console.log("\n✅ 诊断完成!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

