import { ethers } from "hardhat";
import { parseEther, ZeroAddress } from "ethers";

/**
 * 完整的开仓演示脚本
 *
 * 这个脚本演示了在 CINA Protocol 中开仓的完整流程：
 * 1. 部署所需的 Mock 合约
 * 2. 配置系统
 * 3. 执行开仓操作
 * 4. 验证结果
 */

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  CINA Protocol - 开仓交易演示");
  console.log("=".repeat(60) + "\n");

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const user = signers[1] || signers[0]; // fallback to deployer if only one signer
  const deployerAddress = await deployer.getAddress();
  const userAddress = await user.getAddress();
  console.log("👤 Deployer:", deployerAddress);
  console.log("👤 User:", userAddress);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // ==================== 第一步：部署基础设施 ====================
  console.log("📦 第一步：部署基础合约\n");

  // 1.1 部署 Mock 代币
  console.log("  1.1 部署 Mock wstETH (抵押品代币)...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const wstETH = await MockERC20.deploy("Wrapped stETH", "wstETH", 18);
  await wstETH.waitForDeployment();
  const wstETHAddress = await wstETH.getAddress();
  console.log("      ✅ wstETH:", wstETHAddress);

  // 1.2 铸造代币给用户
  await wstETH.mint(userAddress, parseEther("10"));
  console.log("      ✅ Minted 10 wstETH to user");

  // 1.3 部署 fxUSD (债务代币) - 使用简化版本
  console.log("\n  1.2 部署 Mock fxUSD (债务代币)...");
  const fxUSD = await MockERC20.deploy("f(x) USD", "fxUSD", 18);
  await fxUSD.waitForDeployment();
  const fxUSDAddress = await fxUSD.getAddress();
  console.log("      ✅ fxUSD:", fxUSDAddress);

  // 1.4 部署 ReservePool
  console.log("\n  1.3 部署 ReservePool...");
  const ReservePool = await ethers.getContractFactory("ReservePool");

  // 先部署一个临时地址作为 poolManager
  const reservePool = await ReservePool.deploy(deployerAddress, deployerAddress);
  await reservePool.waitForDeployment();
  console.log("      ✅ ReservePool:", await reservePool.getAddress());

  // 1.5 价格预言机（假设）
  console.log("\n  1.4 价格预言机配置...");
  console.log("      ✅ wstETH price: $3000 (假设)");

  // ==================== 第二步：演示概念 ====================
  console.log("\n" + "=".repeat(60));
  console.log("📖 第二步：理解开仓概念\n");

  console.log("  开仓参数说明:");
  console.log("  ├─ pool:        池子地址（存放抵押品的地方）");
  console.log("  ├─ positionId:  0 = 新仓位, >0 = 现有仓位");
  console.log("  ├─ newColl:     抵押品变化（正数=存入，负数=取出）");
  console.log("  └─ newDebt:     债务变化（正数=借入，负数=偿还）\n");

  console.log("  本次演示参数:");
  const collateralAmount = parseEther("1");   // 1 wstETH
  const borrowAmount = parseEther("2000");    // 2000 fxUSD
  console.log("  ├─ 抵押品: 1 wstETH ($3,000)");
  console.log("  ├─ 借款:   2,000 fxUSD");
  console.log("  └─ LTV:    66.67%");

  // ==================== 第三步：模拟开仓流程 ====================
  console.log("\n" + "=".repeat(60));
  console.log("🔄 第三步：模拟开仓流程\n");

  // 3.1 检查用户余额
  console.log("  3.1 检查初始余额:");
  let userWstETH = await wstETH.balanceOf(userAddress);
  let userFxUSD = await fxUSD.balanceOf(userAddress);
  console.log("      wstETH:", ethers.formatEther(userWstETH));
  console.log("      fxUSD: ", ethers.formatEther(userFxUSD));

  // 3.2 用户批准代币
  console.log("\n  3.2 用户批准 wstETH...");
  const demoPoolAddress = deployerAddress; // 使用 deployer 地址模拟池子
  await wstETH.connect(user).approve(demoPoolAddress, collateralAmount);
  console.log("      ✅ Approved", ethers.formatEther(collateralAmount), "wstETH");

  // 3.3 模拟转移抵押品（在真实场景中由 PoolManager 完成）
  console.log("\n  3.3 转移抵押品到池子...");
  await wstETH.connect(user).transfer(demoPoolAddress, collateralAmount);
  console.log("      ✅ Transferred", ethers.formatEther(collateralAmount), "wstETH to pool");

  // 3.4 模拟铸造 fxUSD（在真实场景中由 PoolManager 完成）
  console.log("\n  3.4 铸造并转移 fxUSD 给用户...");
  await fxUSD.mint(userAddress, borrowAmount);
  console.log("      ✅ Minted", ethers.formatEther(borrowAmount), "fxUSD to user");

  // 3.5 检查最终余额
  console.log("\n  3.5 检查最终余额:");
  userWstETH = await wstETH.balanceOf(userAddress);
  userFxUSD = await fxUSD.balanceOf(userAddress);
  const poolWstETH = await wstETH.balanceOf(demoPoolAddress);

  console.log("      用户 wstETH:", ethers.formatEther(userWstETH));
  console.log("      用户 fxUSD: ", ethers.formatEther(userFxUSD));
  console.log("      池子 wstETH:", ethers.formatEther(poolWstETH));

  // ==================== 第四步：展示真实接口调用 ====================
  console.log("\n" + "=".repeat(60));
  console.log("💻 第四步：真实的 PoolManager.operate() 调用示例\n");

  console.log("  在真实环境中，开仓只需一次调用:\n");
  console.log("  ```typescript");
  console.log("  // 1. 批准抵押品");
  console.log("  await wstETH.approve(poolManagerAddress, parseEther('1'));");
  console.log("");
  console.log("  // 2. 调用 operate 开仓");
  console.log("  const tx = await poolManager.operate(");
  console.log("    wstETHPoolAddress,    // 池子地址");
  console.log("    0,                    // positionId (0=新仓位)");
  console.log("    parseEther('1'),      // 存入 1 wstETH");
  console.log("    parseEther('2000')    // 借出 2000 fxUSD");
  console.log("  );");
  console.log("");
  console.log("  const receipt = await tx.wait();");
  console.log("  console.log('Position opened!', receipt.hash);");
  console.log("  ```");

  // ==================== 第五步：其他操作示例 ====================
  console.log("\n" + "=".repeat(60));
  console.log("📚 第五步：其他操作示例\n");

  console.log("  ✅ 增加抵押品:");
  console.log("     await poolManager.operate(pool, 1, parseEther('0.5'), 0);\n");

  console.log("  ✅ 增加借款:");
  console.log("     await poolManager.operate(pool, 1, 0, parseEther('500'));\n");

  console.log("  ✅ 偿还债务:");
  console.log("     await fxUSD.approve(poolManager, parseEther('1000'));");
  console.log("     await poolManager.operate(pool, 1, 0, parseEther('-1000'));\n");

  console.log("  ✅ 取出抵押品:");
  console.log("     await poolManager.operate(pool, 1, parseEther('-0.2'), 0);\n");

  console.log("  ✅ 关闭仓位:");
  console.log("     await poolManager.operate(pool, 1, MIN_INT256, MIN_INT256);\n");

  // ==================== 总结 ====================
  console.log("=".repeat(60));
  console.log("🎉 演示完成！\n");
  console.log("📊 总结:");
  console.log("  ✅ 成功模拟了开仓流程");
  console.log("  ✅ 用户从 10 wstETH 减少到 9 wstETH");
  console.log("  ✅ 用户获得了 2000 fxUSD");
  console.log("  ✅ 池子收到了 1 wstETH 作为抵押品");
  console.log("");
  console.log("💡 关键要点:");
  console.log("  1. 开仓需要先批准抵押品代币");
  console.log("  2. 调用 poolManager.operate() 完成所有操作");
  console.log("  3. positionId=0 表示开新仓位");
  console.log("  4. 正数表示存入/借入，负数表示取出/偿还");
  console.log("");
  console.log("⚠️  风险提示:");
  console.log("  • 保持足够的抵押率（建议 > 150%）");
  console.log("  • 监控抵押品价格波动");
  console.log("  • 注意各种费用（开仓费、借款费等）");
  console.log("  • 低于清算阈值会被清算");
  console.log("=".repeat(60) + "\n");

  // ==================== 完整代码示例 ====================
  console.log("📝 完整的生产环境代码示例:\n");
  const exampleCode = `
import { ethers } from "hardhat";
import { parseEther } from "ethers";

async function openPosition() {
  const [user] = await ethers.getSigners();

  // 合约地址
  const poolManagerAddr = "0x66713e76897CdC363dF358C853df5eE5831c3E5a";
  const wstETHPoolAddr = "0x..."; // wstETH Pool 地址
  const wstETHAddr = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";

  // 获取合约实例
  const poolManager = await ethers.getContractAt("PoolManager", poolManagerAddr);
  const wstETH = await ethers.getContractAt("IERC20", wstETHAddr);

  // 参数
  const collateral = parseEther("1");    // 1 wstETH
  const debt = parseEther("2000");       // 2000 fxUSD

  console.log("Opening position...");
  console.log("Collateral:", ethers.formatEther(collateral), "wstETH");
  console.log("Debt:", ethers.formatEther(debt), "fxUSD");

  // 批准
  const approveTx = await wstETH.approve(poolManagerAddr, collateral);
  await approveTx.wait();
  console.log("✅ Approved");

  // 开仓
  const tx = await poolManager.operate(
    wstETHPoolAddr,
    0,           // 新仓位
    collateral,
    debt
  );

  const receipt = await tx.wait();
  console.log("✅ Position opened!");
  console.log("Transaction:", tx.hash);
  console.log("Gas used:", receipt.gasUsed.toString());

  // 获取仓位 ID（从事件中）
  const operateEvent = receipt.logs.find(log => {
    try {
      return poolManager.interface.parseLog(log)?.name === "Operate";
    } catch { return false; }
  });

  if (operateEvent) {
    const parsed = poolManager.interface.parseLog(operateEvent);
    console.log("Position ID:", parsed?.args.position.toString());
  }

  return receipt;
}

// 运行
openPosition()
  .then(() => console.log("Done!"))
  .catch(console.error);
`;

  console.log(exampleCode);

  console.log("\n✨ 演示脚本执行完毕！");
  console.log("📖 查看详细文档: POSITION_OPENING_TEST_REPORT.md");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
