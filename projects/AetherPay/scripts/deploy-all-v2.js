/**
 * 一键部署所有V2合约
 * 包含所有优化和修复
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting V2 contracts deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH\n");

  // 部署地址记录
  const deployedAddresses = {};

  try {
    // 1. 部署 FXRouter
    console.log("1️⃣ Deploying FXRouter...");
    const FXRouter = await ethers.getContractFactory("FXRouter");
    const fxRouter = await FXRouter.deploy();
    await fxRouter.deployed();
    deployedAddresses.FXRouter = fxRouter.address;
    console.log("✅ FXRouter deployed to:", fxRouter.address);

    // 2. 部署 PublicGoodsFundV2 (修复了价差计算)
    console.log("\n2️⃣ Deploying PublicGoodsFundV2...");
    const PublicGoodsFundV2 = await ethers.getContractFactory("PublicGoodsFundV2");
    const publicGoodsFund = await PublicGoodsFundV2.deploy();
    await publicGoodsFund.deployed();
    deployedAddresses.PublicGoodsFundV2 = publicGoodsFund.address;
    console.log("✅ PublicGoodsFundV2 deployed to:", publicGoodsFund.address);

    // 3. 部署 AetherOracleV3_EigenDA
    console.log("\n3️⃣ Deploying AetherOracleV3_EigenDA...");
    const AetherOracleV3 = await ethers.getContractFactory("AetherOracleV3_EigenDA");
    const aetherOracle = await AetherOracleV3.deploy();
    await aetherOracle.deployed();
    deployedAddresses.AetherOracleV3_EigenDA = aetherOracle.address;
    console.log("✅ AetherOracleV3_EigenDA deployed to:", aetherOracle.address);

    // 4. 部署 PaymentGatewayV2 (修复了MEV、tx.origin、费率问题)
    console.log("\n4️⃣ Deploying PaymentGatewayV2...");
    const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");

    // Treasury 和 Donation 地址（可以修改为你的地址）
    const treasuryAddress = deployer.address; // 暂时使用部署者地址
    const donationAddress = deployer.address; // 暂时使用部署者地址

    const paymentGateway = await PaymentGatewayV2.deploy(
      fxRouter.address,
      treasuryAddress,
      donationAddress,
      publicGoodsFund.address,
      aetherOracle.address
    );
    await paymentGateway.deployed();
    deployedAddresses.PaymentGatewayV2 = paymentGateway.address;
    console.log("✅ PaymentGatewayV2 deployed to:", paymentGateway.address);

    // 5. 配置 PublicGoodsFund - 授权 PaymentGateway
    console.log("\n5️⃣ Configuring PublicGoodsFund...");
    await publicGoodsFund.addAuthorizedGateway(paymentGateway.address);
    console.log("✅ PaymentGateway authorized in PublicGoodsFund");

    // 6. 配置支持的代币
    console.log("\n6️⃣ Configuring supported tokens...");

    // Optimism Sepolia 测试代币地址
    const tokens = {
      USDC: "0xb7225051e57db0296C1F56fbD536Acd06c889724",
      USDT: "0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2",
      DAI: "0x453Cbf07Af7293FDee270C9A15a95aedaEaA383e",
      WETH: "0x134AA0b1B739d80207566B473534601DCea2aD92",
      WBTC: "0xCA38436dB07b3Ee43851E6de3A0A9333738eAC9A"
    };

    // 添加支持的代币到 PublicGoodsFund
    for (const [symbol, address] of Object.entries(tokens)) {
      await publicGoodsFund.addSupportedToken(address);
      console.log(`✅ Added ${symbol} to PublicGoodsFund`);
    }

    // 添加支持的代币到 PaymentGateway
    for (const [symbol, address] of Object.entries(tokens)) {
      await paymentGateway.addSupportedToken(address);
      console.log(`✅ Added ${symbol} to PaymentGateway`);
    }

    // 7. 设置代币符号映射
    console.log("\n7️⃣ Setting token symbols...");
    for (const [symbol, address] of Object.entries(tokens)) {
      await paymentGateway.setTokenSymbol(address, symbol);
    }
    console.log("✅ Token symbols configured");

    // 8. 设置稳定币标记（用于动态费率）
    console.log("\n8️⃣ Marking stablecoins...");
    const stablecoins = [tokens.USDC, tokens.USDT, tokens.DAI];
    for (const address of stablecoins) {
      await paymentGateway.setStablecoin(address, true);
    }
    console.log("✅ Stablecoins marked for preferential rates");

    // 9. 添加 Oracle 节点
    console.log("\n9️⃣ Adding Oracle node...");
    await aetherOracle.addOracleNode(deployer.address);
    console.log("✅ Oracle node added:", deployer.address);

    // 10. 保存部署地址
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      contracts: deployedAddresses,
      tokens: tokens,
      configuration: {
        platformFeeRate: "0.2%",
        stablecoinFeeRate: "0.1%",
        donationPercentage: "5% of platform fee",
        spreadCapBps: "100 (1%)"
      }
    };

    const deploymentPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath);
    }

    const filename = `deployment-v2-${network.name}-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(deploymentPath, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✅ Deployment info saved to:", filename);

    // 11. 打印总结
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n📋 Contract Addresses:");
    console.log("-".repeat(60));
    for (const [name, address] of Object.entries(deployedAddresses)) {
      console.log(`${name.padEnd(25)} : ${address}`);
    }
    console.log("-".repeat(60));

    console.log("\n💡 Key Improvements:");
    console.log("• MEV Protection: ✅ 95% minimum output guaranteed");
    console.log("• Spread Donation: ✅ Real spread calculation (not fixed 0.05%)");
    console.log("• Contributor Identity: ✅ Using order.payer (not tx.origin)");
    console.log("• Competitive Fees: ✅ 0.2% regular, 0.1% stablecoins");
    console.log("• Dynamic Routing: ✅ 1inch integration ready");

    console.log("\n⚠️ Next Steps:");
    console.log("1. Update frontend .env with new contract addresses");
    console.log("2. Update oracle server .env with new addresses");
    console.log("3. Verify contracts on Etherscan (optional)");
    console.log("4. Test all functions before production use");

    return deployedAddresses;

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });