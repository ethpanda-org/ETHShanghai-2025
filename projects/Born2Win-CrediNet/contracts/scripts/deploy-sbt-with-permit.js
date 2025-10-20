const { ethers } = require("hardhat");

/**
 * 部署支持 EIP-712 许可式铸造的 CrediNetSBT
 * 使用方法：
 * npx hardhat run scripts/deploy-sbt-with-permit.js --network sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("CrediNet SBT (EIP-712 Permit) 部署");
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
  console.log("   - Version:", await sbt.VERSION());
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

  // 3.3 授予后端签名者 MINTER_ROLE
  const signerAddress = process.env.SIGNER_ADDRESS || deployer.address;
  console.log("   3.3 授予 MINTER_ROLE 给签名者:", signerAddress);
  const MINTER_ROLE = await sbt.MINTER_ROLE();
  const tx3 = await sbt.grantRole(MINTER_ROLE, signerAddress);
  await tx3.wait();
  console.log("   ✅ MINTER_ROLE 已授予");

  // 3.4 验证角色
  console.log("   3.4 验证角色...");
  const hasMinterRole = await sbt.hasRole(MINTER_ROLE, signerAddress);
  console.log("   签名者拥有 MINTER_ROLE:", hasMinterRole ? "✅" : "❌");

  const hasAdminRole = await sbt.hasRole(await sbt.DEFAULT_ADMIN_ROLE(), deployer.address);
  console.log("   部署者拥有 DEFAULT_ADMIN_ROLE:", hasAdminRole ? "✅" : "❌");

  console.log("");

  // ========== 4. 验证部署 ==========
  console.log("📝 步骤 4: 验证部署...");
  const configuredAgent = await sbt.getDynamicAgent();
  console.log("   SBT 配置的 Agent:", configuredAgent);
  console.log("   是否正确:", configuredAgent === agentAddress ? "✅" : "❌");

  const hasUpdaterRole = await agent.hasRole(UPDATER_ROLE, sbtAddress);
  console.log("   SBT 是否有 UPDATER_ROLE:", hasUpdaterRole ? "✅" : "❌");

  // 验证 EIP-712 域信息
  const domainSeparator = await sbt.eip712Domain();
  console.log("   EIP-712 域名:", domainSeparator.name);
  console.log("   EIP-712 版本:", domainSeparator.version);
  console.log("   链 ID:", domainSeparator.chainId.toString());

  console.log("");

  // ========== 5. 部署总结 ==========
  console.log("========================================");
  console.log("🎉 部署完成！");
  console.log("========================================");
  console.log("📋 部署信息:");
  console.log("   DynamicSBTAgent:", agentAddress);
  console.log("   CrediNetSBT:", sbtAddress);
  console.log("   Signer Address:", signerAddress);
  console.log("");
  console.log("📝 后端环境变量 (.env):");
  console.log(`   SBT_CONTRACT_ADDRESS=${sbtAddress}`);
  console.log(`   SBT_CONTRACT_NAME=${name}`);
  console.log(`   CHAIN_ID=${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`   # SIGNER_PRIVATE_KEY=0x...  (需要手动配置)`);
  console.log("");
  console.log("🔧 前端配置 (src/contracts/addresses.ts):");
  console.log(`   SBTRegistry: "${sbtAddress}",`);
  console.log(`   DynamicSBTAgent: "${agentAddress}",`);
  console.log("");
  console.log("🤖 Agent 服务配置 (agent-service/.env):");
  console.log(`   DYNAMIC_AGENT_ADDRESS=${agentAddress}`);
  console.log(`   SBT_ADDRESS=${sbtAddress}`);
  console.log("");

  console.log("========================================");
  console.log("✨ 全部完成！");
  console.log("========================================");

  return {
    dynamicSBTAgent: agentAddress,
    credrNetSBT: sbtAddress,
    signerAddress: signerAddress,
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
