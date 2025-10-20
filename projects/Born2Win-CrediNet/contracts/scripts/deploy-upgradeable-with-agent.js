const { ethers, upgrades } = require("hardhat");

/**
 * 可升级版本集成部署脚本：部署 SBTUpgradeable + DynamicSBTAgent
 * 使用方法：
 * npx hardhat run scripts/deploy-upgradeable-with-agent.js --network sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("CrediNet SBT Upgradeable + Agent 集成部署");
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

  // ========== 2. 部署 CrediNetSBTUpgradeable (UUPS Proxy) ==========
  console.log("📝 步骤 2: 部署 CrediNetSBTUpgradeable (UUPS代理)...");
  const name = process.env.SBT_NAME || "CrediNet SBT Upgradeable";
  const symbol = process.env.SBT_SYMBOL || "CNSBTU";
  const baseURI = process.env.SBT_BASE_URI || "";
  const forwarder = process.env.TRUSTED_FORWARDER || ethers.ZeroAddress;

  const Factory = await ethers.getContractFactory("CrediNetSBTUpgradeable");
  const proxy = await upgrades.deployProxy(
    Factory,
    [name, symbol, baseURI, forwarder, agentAddress], // ✅ 传入 Agent 地址
    { kind: "uups" }
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("✅ SBT Proxy 已部署:", proxyAddress);
  console.log("   - Name:", name);
  console.log("   - Symbol:", symbol);
  console.log("   - Trusted Forwarder:", forwarder);
  console.log("   - DynamicAgent:", agentAddress);
  console.log("");

  // ========== 3. 配置集成 ==========
  console.log("📝 步骤 3: 配置合约集成...");

  // 3.1 授予 SBT Proxy UPDATER_ROLE
  console.log("   3.1 授予 SBT Proxy UPDATER_ROLE...");
  const UPDATER_ROLE = await agent.UPDATER_ROLE();
  const tx1 = await agent.grantRole(UPDATER_ROLE, proxyAddress);
  await tx1.wait();
  console.log("   ✅ UPDATER_ROLE 已授予");

  // 3.2 可选：配置 Oracle
  const oracleAddress = process.env.ORACLE_ADDRESS;
  if (oracleAddress) {
    console.log("   3.2 配置 Oracle 地址...");
    const ORACLE_ROLE = await agent.ORACLE_ROLE();
    const tx2 = await agent.grantRole(ORACLE_ROLE, oracleAddress);
    await tx2.wait();
    console.log("   ✅ ORACLE_ROLE 已授予:", oracleAddress);
  }

  // 3.3 授予部署者 MINTER_ROLE（可选）
  console.log("   3.3 授予部署者 MINTER_ROLE...");
  const MINTER_ROLE = await proxy.MINTER_ROLE();
  const tx3 = await proxy.grantRole(MINTER_ROLE, deployer.address);
  await tx3.wait();
  console.log("   ✅ MINTER_ROLE 已授予");

  console.log("");

  // ========== 4. 验证部署 ==========
  console.log("📝 步骤 4: 验证部署...");
  const configuredAgent = await proxy.getDynamicAgent();
  console.log("   SBT 配置的 Agent:", configuredAgent);
  console.log("   是否正确:", configuredAgent === agentAddress ? "✅" : "❌");

  const hasUpdaterRole = await agent.hasRole(UPDATER_ROLE, proxyAddress);
  console.log("   SBT 是否有 UPDATER_ROLE:", hasUpdaterRole ? "✅" : "❌");

  const hasMinterRole = await proxy.hasRole(MINTER_ROLE, deployer.address);
  console.log("   部署者是否有 MINTER_ROLE:", hasMinterRole ? "✅" : "❌");

  console.log("");

  // ========== 5. 部署总结 ==========
  console.log("========================================");
  console.log("🎉 部署完成！");
  console.log("========================================");
  console.log("📋 部署信息:");
  console.log("   DynamicSBTAgent:", agentAddress);
  console.log("   SBT Proxy (UUPS):", proxyAddress);
  console.log("");
  console.log("📝 需要保存到配置文件:");
  console.log(`   DYNAMIC_SBT_AGENT_ADDRESS=${agentAddress}`);
  console.log(`   SBT_PROXY=${proxyAddress}`);
  console.log("");
  console.log("🔧 前端配置:");
  console.log("   更新 src/contracts/addresses.ts:");
  console.log(`   SBTRegistry: "${proxyAddress}",`);
  console.log(`   DynamicSBTAgent: "${agentAddress}",`);
  console.log("");
  console.log("🤖 Agent 服务配置:");
  console.log("   更新 agent-service/.env:");
  console.log(`   DYNAMIC_AGENT_ADDRESS=${agentAddress}`);
  console.log(`   SBT_PROXY=${proxyAddress}`);
  console.log("");

  console.log("========================================");
  console.log("✨ 全部完成！");
  console.log("========================================");

  return {
    dynamicSBTAgent: agentAddress,
    sbtProxy: proxyAddress,
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;

