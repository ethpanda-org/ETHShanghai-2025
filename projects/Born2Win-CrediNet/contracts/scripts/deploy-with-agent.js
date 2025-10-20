const { ethers } = require("hardhat");

/**
 * 集成部署脚本：部署 SBT + DynamicSBTAgent 并完成配置
 * 使用方法：
 * npx hardhat run scripts/deploy-with-agent.js --network sepolia
 * npx hardhat run scripts/deploy-with-agent.js --network base_sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("CrediNet SBT + DynamicSBTAgent 集成部署");
  console.log("========================================");
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");

  // ========== 1. 部署 DynamicSBTAgent ==========
  console.log("📝 步骤 1: 部署 DynamicSBTAgent...");
  const DynamicSBTAgent = await ethers.getContractFactory("DynamicSBTAgent");
  const agent = await DynamicSBTAgent.deploy();
  await agent.waitForDeployment();
  const agentAddress = await agent.getAddress();
  console.log("✅ DynamicSBTAgent 已部署:", agentAddress);
  console.log("");

  // ========== 2. 部署 CrediNetSBT ==========
  console.log("📝 步骤 2: 部署 CrediNetSBT...");
  const name = process.env.SBT_NAME || "CrediNet SBT";
  const symbol = process.env.SBT_SYMBOL || "CNSBT";
  const baseURI = process.env.SBT_BASE_URI || "";
  
  const CrediNetSBT = await ethers.getContractFactory("CrediNetSBT");
  const sbt = await CrediNetSBT.deploy(name, symbol, baseURI);
  await sbt.waitForDeployment();
  const sbtAddress = await sbt.getAddress();
  console.log("✅ CrediNetSBT 已部署:", sbtAddress);
  console.log("   - Name:", name);
  console.log("   - Symbol:", symbol);
  console.log("   - Base URI:", baseURI || "(empty)");
  console.log("");

  // ========== 3. 配置集成 ==========
  console.log("📝 步骤 3: 配置合约集成...");
  
  // 3.1 设置 SBT 的 DynamicAgent 地址
  console.log("   3.1 设置 SBT.setDynamicAgent()...");
  const tx1 = await sbt.setDynamicAgent(agentAddress);
  await tx1.wait();
  console.log("   ✅ DynamicAgent 地址已设置");

  // 3.2 授予 SBT 合约 UPDATER_ROLE
  console.log("   3.2 授予 SBT 合约 UPDATER_ROLE...");
  const UPDATER_ROLE = await agent.UPDATER_ROLE();
  const tx2 = await agent.grantRole(UPDATER_ROLE, sbtAddress);
  await tx2.wait();
  console.log("   ✅ UPDATER_ROLE 已授予");

  // 3.3 可选：配置 Oracle 角色（用于链下Agent服务）
  const oracleAddress = process.env.ORACLE_ADDRESS;
  if (oracleAddress) {
    console.log("   3.3 配置 Oracle 地址...");
    const ORACLE_ROLE = await agent.ORACLE_ROLE();
    const tx3 = await agent.grantRole(ORACLE_ROLE, oracleAddress);
    await tx3.wait();
    console.log("   ✅ ORACLE_ROLE 已授予:", oracleAddress);
  } else {
    console.log("   ⚠️  未设置 ORACLE_ADDRESS 环境变量，部署者将作为 Oracle");
  }

  console.log("");

  // ========== 4. 验证部署 ==========
  console.log("📝 步骤 4: 验证部署...");
  const configuredAgent = await sbt.getDynamicAgent();
  console.log("   SBT 配置的 Agent:", configuredAgent);
  console.log("   是否正确:", configuredAgent === agentAddress ? "✅" : "❌");
  
  const hasUpdaterRole = await agent.hasRole(UPDATER_ROLE, sbtAddress);
  console.log("   SBT 是否有 UPDATER_ROLE:", hasUpdaterRole ? "✅" : "❌");
  
  console.log("");

  // ========== 5. 部署总结 ==========
  console.log("========================================");
  console.log("🎉 部署完成！");
  console.log("========================================");
  console.log("📋 部署信息:");
  console.log("   DynamicSBTAgent:", agentAddress);
  console.log("   CrediNetSBT:", sbtAddress);
  console.log("");
  console.log("📝 需要保存到配置文件:");
  console.log(`   DYNAMIC_SBT_AGENT_ADDRESS=${agentAddress}`);
  console.log(`   SBT_ADDRESS=${sbtAddress}`);
  console.log("");
  console.log("🔧 前端配置:");
  console.log("   更新 src/contracts/addresses.ts:");
  console.log(`   SBTRegistry: "${sbtAddress}",`);
  console.log(`   DynamicSBTAgent: "${agentAddress}",`);
  console.log("");
  console.log("🤖 Agent 服务配置:");
  console.log("   更新 agent-service/.env:");
  console.log(`   DYNAMIC_AGENT_ADDRESS=${agentAddress}`);
  console.log(`   SBT_ADDRESS=${sbtAddress}`);
  console.log("");

  // ========== 6. 验证合约（可选） ==========
  if (process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY) {
    console.log("⏳ 等待 30 秒后进行合约验证...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      console.log("📝 验证 DynamicSBTAgent...");
      await hre.run("verify:verify", {
        address: agentAddress,
        constructorArguments: [],
      });
      console.log("✅ DynamicSBTAgent 验证成功");
    } catch (error) {
      console.log("⚠️  DynamicSBTAgent 验证失败:", error.message);
    }

    try {
      console.log("📝 验证 CrediNetSBT...");
      await hre.run("verify:verify", {
        address: sbtAddress,
        constructorArguments: [name, symbol, baseURI],
      });
      console.log("✅ CrediNetSBT 验证成功");
    } catch (error) {
      console.log("⚠️  CrediNetSBT 验证失败:", error.message);
    }
  }

  console.log("");
  console.log("========================================");
  console.log("✨ 全部完成！");
  console.log("========================================");

  // 返回部署的地址（供其他脚本使用）
  return {
    dynamicSBTAgent: agentAddress,
    credr: sbtAddress,
  };
}

// 执行部署
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;

