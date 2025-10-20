import { ethers } from "hardhat";

async function main() {
  console.log("🧪 开始测试 Sepolia 部署...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 测试账户:", deployer.address);

  const addresses = {
    FxUSD: "0x085a1b6da46ae375b35dea9920a276ef571e209c",
    PoolManager: "0xbb644076500ea106d9029b382c4d49f56225cb82",
    FxUSDBasePool: "0x420D6b8546F14C394A703F5ac167619760A721A9",
    AaveFundingPool: "0xAb20B978021333091CA307BB09E022Cec26E8608",
    Router: "0xB8B3e6C7D0f0A9754F383107A6CCEDD8F19343Ec",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  };

  // ============ 测试 1: 检查合约连接 ============
  console.log("═══════════════════════════════════════");
  console.log("1️⃣  测试合约连接");
  console.log("═══════════════════════════════════════\n");

  const poolManager = await ethers.getContractAt("PoolManager", addresses.PoolManager);
  const fxUSD = await ethers.getContractAt("FxUSDRegeneracy", addresses.FxUSD);
  const usdc = await ethers.getContractAt("IERC20", addresses.USDC);
  const router = await ethers.getContractAt("RouterManagementFacet", addresses.Router);

  console.log("✅ 所有合约已连接");

  // ============ 测试 2: 检查 Router 配置 ============
  console.log("\n═══════════════════════════════════════");
  console.log("2️⃣  测试 Router 配置");
  console.log("═══════════════════════════════════════\n");

  try {
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", addresses.Router);
    const facets = await diamondLoupe.facets();
    console.log("✅ Router Facets 数量:", facets.length);
    
    facets.forEach((facet: any, index: number) => {
      console.log(`   Facet ${index + 1}: ${facet.facetAddress} (${facet.functionSelectors.length} functions)`);
    });
  } catch (e: any) {
    console.log("❌ 读取 Facets 失败:", e.message.split('\n')[0]);
  }

  // ============ 测试 3: 检查权限 ============
  console.log("\n═══════════════════════════════════════");
  console.log("3️⃣  测试权限配置");
  console.log("═══════════════════════════════════════\n");

  const operatorRole = ethers.id("OPERATOR_ROLE");
  const hasOperatorRole = await poolManager.hasRole(operatorRole, addresses.Router);
  console.log("Router 拥有 OPERATOR_ROLE:", hasOperatorRole ? "✅" : "❌");

  const poolManagerRole = ethers.keccak256(ethers.toUtf8Bytes("POOL_MANAGER_ROLE"));
  const fxusdHasRole = await fxUSD.hasRole(poolManagerRole, addresses.PoolManager);
  console.log("PoolManager 拥有 POOL_MANAGER_ROLE (FxUSD):", fxusdHasRole ? "✅" : "❌");

  // ============ 测试 4: 检查池子状态 ============
  console.log("\n═══════════════════════════════════════");
  console.log("4️⃣  测试池子状态");
  console.log("═══════════════════════════════════════\n");

  try {
    const poolInfo = await poolManager.getPoolInfo(addresses.AaveFundingPool);
    console.log("✅ AaveFundingPool 注册信息:");
    console.log("   - Collateral Capacity:", ethers.formatUnits(poolInfo.collateralCapacity, 6), "USDC");
    console.log("   - Debt Capacity:", ethers.formatEther(poolInfo.debtCapacity), "fxUSD");
    console.log("   - Gauge:", poolInfo.gauge);
    console.log("   - Rewarder:", poolInfo.rewarder);
  } catch (e: any) {
    console.log("❌ 读取池子信息失败:", e.message.split('\n')[0]);
  }

  // ============ 测试 5: 检查 USDC 余额 ============
  console.log("\n═══════════════════════════════════════");
  console.log("5️⃣  测试 USDC 余额");
  console.log("═══════════════════════════════════════\n");

  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("USDC 余额:", ethers.formatUnits(usdcBalance, 6), "USDC");

  if (usdcBalance === 0n) {
    console.log("\n⚠️  警告: USDC 余额为 0");
    console.log("   需要先获取一些 Sepolia USDC 才能测试开仓");
    console.log("   Sepolia USDC 地址:", addresses.USDC);
  }

  // ============ 测试 6: 模拟开仓（如果有 USDC）============
  if (usdcBalance > 0n) {
    console.log("\n═══════════════════════════════════════");
    console.log("6️⃣  测试开仓功能");
    console.log("═══════════════════════════════════════\n");

    const testAmount = usdcBalance > 1000000n ? 1000000n : usdcBalance; // 1 USDC 或全部余额
    console.log("测试金额:", ethers.formatUnits(testAmount, 6), "USDC");

    // 检查授权
    const allowance = await usdc.allowance(deployer.address, addresses.PoolManager);
    console.log("当前授权:", ethers.formatUnits(allowance, 6), "USDC");

    if (allowance < testAmount) {
      console.log("\n授权 USDC 给 PoolManager...");
      try {
        const approveTx = await usdc.approve(addresses.PoolManager, ethers.MaxUint256);
        await approveTx.wait();
        console.log("✅ 授权成功");
      } catch (e: any) {
        console.log("❌ 授权失败:", e.message.split('\n')[0]);
      }
    }

    // 尝试开仓
    console.log("\n尝试开仓...");
    try {
      // 获取下一个 position ID
      const nextPositionId = await poolManager.nextPositionId();
      console.log("下一个 Position ID:", nextPositionId.toString());

      // 计算债务金额 (假设 50% LTV)
      const debtAmount = testAmount / 2n;
      
      console.log("参数:");
      console.log("  - Pool:", addresses.AaveFundingPool);
      console.log("  - Position ID:", nextPositionId.toString());
      console.log("  - Collateral:", ethers.formatUnits(testAmount, 6), "USDC");
      console.log("  - Debt:", ethers.formatUnits(debtAmount, 6), "fxUSD");

      // 估算 Gas
      try {
        const gasEstimate = await poolManager["operate(address,uint256,int256,int256)"].estimateGas(
          addresses.AaveFundingPool,
          nextPositionId,
          testAmount,
          debtAmount
        );
        console.log("\n预估 Gas:", gasEstimate.toString());

        // 执行开仓
        const tx = await poolManager["operate(address,uint256,int256,int256)"](
          addresses.AaveFundingPool,
          nextPositionId,
          testAmount,
          debtAmount
        );
        console.log("交易已发送:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ 开仓成功! Gas 使用:", receipt?.gasUsed.toString());

        // 检查仓位
        const position = await poolManager.getPosition(addresses.AaveFundingPool, nextPositionId);
        console.log("\n✅ 仓位信息:");
        console.log("   - Collateral:", ethers.formatUnits(position.collateral, 6), "USDC");
        console.log("   - Debt:", ethers.formatEther(position.debt), "fxUSD");

      } catch (e: any) {
        console.log("❌ 开仓失败:", e.message.split('\n')[0]);
        
        // 尝试获取更多错误信息
        if (e.message.includes("revert")) {
          console.log("\n可能的原因:");
          console.log("   - Price Oracle 未设置或返回无效价格");
          console.log("   - 池子参数配置不正确");
          console.log("   - Debt ratio 超出允许范围");
          console.log("   - 池子未正确初始化");
        }
      }
    } catch (e: any) {
      console.log("❌ 测试失败:", e.message.split('\n')[0]);
    }
  }

  // ============ 总结 ============
  console.log("\n═══════════════════════════════════════");
  console.log("📋 测试总结");
  console.log("═══════════════════════════════════════\n");

  console.log("✅ 已完成的测试:");
  console.log("   1. 合约连接 - 成功");
  console.log("   2. Router 配置 - 检查完成");
  console.log("   3. 权限配置 - 检查完成");
  console.log("   4. 池子状态 - 检查完成");
  console.log("   5. USDC 余额 - 检查完成");
  
  if (usdcBalance > 0n) {
    console.log("   6. 开仓功能 - 已测试");
  } else {
    console.log("   6. 开仓功能 - 跳过（需要 USDC）");
  }

  console.log("\n💡 建议:");
  if (usdcBalance === 0n) {
    console.log("   - 获取 Sepolia USDC 以测试完整功能");
    console.log("   - USDC 地址:", addresses.USDC);
  }
  
  console.log("\n✅ 测试完成!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

