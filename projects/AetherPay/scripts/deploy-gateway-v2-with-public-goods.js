const { ethers } = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 Deploying PaymentGatewayV2 with PublicGoodsFund Integration");
  console.log("=".repeat(70) + "\n");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // ============ 已部署的合约地址（OP Sepolia）============

  // 从 addresses.json 获取正确的地址
  const FX_ROUTER = "0x81C8F2AdD03187A17F8998541e27E2dD7566c504"; // ✅ 正确地址
  const TREASURY = deployer.address;
  const DONATION = deployer.address;

  // 已部署的合约
  const PUBLIC_GOODS_FUND = "0xCc9b8861CB2e42A043376433A73F2f019A7B2e1B";
  const AETHER_ORACLE_V2 = "0x1D323b80710c1d0c833B920CB7Ace09c49e237d7";

  // Token addresses
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";
  const DAI = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";

  console.log("📋 Configuration:");
  console.log("   FXRouter:         ", FX_ROUTER);
  console.log("   Treasury:         ", TREASURY);
  console.log("   Donation:         ", DONATION);
  console.log("   PublicGoodsFund:  ", PUBLIC_GOODS_FUND);
  console.log("   AetherOracleV2:   ", AETHER_ORACLE_V2);
  console.log("");

  // ============ 部署 PaymentGatewayV2 ============
  console.log("⏳ Deploying PaymentGatewayV2 with PublicGoodsFund integration...");
  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");

  const gateway = await PaymentGatewayV2.deploy(
    FX_ROUTER,
    TREASURY,
    DONATION,
    PUBLIC_GOODS_FUND,  // 🆕 PublicGoodsFund address
    AETHER_ORACLE_V2    // 🆕 AetherOracle address
  );

  await gateway.deployed();

  console.log("✅ PaymentGatewayV2 deployed to:", gateway.address);
  console.log("");

  // 等待确认
  console.log("⏳ Waiting for 3 block confirmations...");
  await gateway.deployTransaction.wait(3);
  console.log("✅ Confirmed!\n");

  // ============ 配置支持的 Token ============
  console.log("⏳ Adding supported tokens...");

  let tx = await gateway.addSupportedToken(MOCK_USDC);
  await tx.wait();
  console.log("   ✅ USDC added:", MOCK_USDC);

  tx = await gateway.addSupportedToken(MOCK_USDT);
  await tx.wait();
  console.log("   ✅ USDT added:", MOCK_USDT);

  tx = await gateway.addSupportedToken(DAI);
  await tx.wait();
  console.log("   ✅ DAI added:", DAI);
  console.log("");

  // ============ 配置 Token Symbols（用于交易对）============
  console.log("⏳ Setting token symbols for trading pairs...");

  tx = await gateway.setTokenSymbols(
    [MOCK_USDC, MOCK_USDT, DAI],
    ["USDC", "USDT", "DAI"]
  );
  await tx.wait();
  console.log("   ✅ Token symbols configured");
  console.log("");

  // ============ 验证配置 ============
  console.log("🔍 Verifying integration...");

  const publicGoodsFundAddress = await gateway.publicGoodsFund();
  const aetherOracleAddress = await gateway.aetherOracle();
  const spreadDonationEnabled = await gateway.enableSpreadDonation();

  console.log("   PublicGoodsFund:     ", publicGoodsFundAddress);
  console.log("   AetherOracle:        ", aetherOracleAddress);
  console.log("   Spread Donation:     ", spreadDonationEnabled ? "✅ Enabled" : "❌ Disabled");
  console.log("");

  // ============ 保存部署信息 ============
  const fs = require('fs');
  const deploymentInfo = {
    network: "optimism-sepolia",
    chainId: 11155420,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PaymentGatewayV2: gateway.address,
      FXRouter: FX_ROUTER,
      Treasury: TREASURY,
      DonationAddress: DONATION,
      PublicGoodsFund: PUBLIC_GOODS_FUND,
      AetherOracleV2: AETHER_ORACLE_V2,
      SupportedTokens: {
        USDC: MOCK_USDC,
        USDT: MOCK_USDT,
        DAI: DAI
      },
      TokenSymbols: {
        [MOCK_USDC]: "USDC",
        [MOCK_USDT]: "USDT",
        [DAI]: "DAI"
      }
    },
    features: {
      spreadDonationEnabled: spreadDonationEnabled,
      publicGoodsFundIntegrated: true
    },
    blockNumber: await ethers.provider.getBlockNumber(),
    gasUsed: gateway.deployTransaction.gasLimit.toString()
  };

  fs.writeFileSync(
    'deployment-gateway-v2-public-goods.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployment-gateway-v2-public-goods.json\n");

  console.log("=".repeat(70));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(70) + "\n");

  console.log("📋 Contract Addresses:");
  console.log("   PaymentGatewayV2:  ", gateway.address);
  console.log("   PublicGoodsFund:   ", PUBLIC_GOODS_FUND);
  console.log("   AetherOracleV2:    ", AETHER_ORACLE_V2);
  console.log("   FXRouter:          ", FX_ROUTER);
  console.log("");

  console.log("🔗 Etherscan URLs:");
  console.log("   Gateway:           ", `https://sepolia-optimism.etherscan.io/address/${gateway.address}`);
  console.log("   PublicGoodsFund:   ", `https://sepolia-optimism.etherscan.io/address/${PUBLIC_GOODS_FUND}`);
  console.log("");

  console.log("📝 Next Steps:");
  console.log("   1. Verify contract on Etherscan:");
  console.log(`      npx hardhat verify --network op-sepolia ${gateway.address} \\`);
  console.log(`        "${FX_ROUTER}" "${TREASURY}" "${DONATION}" "${PUBLIC_GOODS_FUND}" "${AETHER_ORACLE_V2}"`);
  console.log("");
  console.log("   2. Update frontend contracts.ts with new PaymentGatewayV2 address:");
  console.log(`      PAYMENT_GATEWAY_V2: '${gateway.address}',`);
  console.log("");
  console.log("   3. Add PublicGoodsFund to supported tokens:");
  console.log(`      Run: npx hardhat run scripts/configure-public-goods-fund.js --network op-sepolia`);
  console.log("");
  console.log("   4. Test cross-currency payment to verify spread donation works!");
  console.log("");
  console.log("   5. Update PAYMENT_GATEWAY_ABI in frontend/lib/contracts.ts");
  console.log("");

  console.log("🌟 Key Features Enabled:");
  console.log("   ✅ Automatic spread donation to PublicGoodsFund");
  console.log("   ✅ AI-powered rate comparison via AetherOracle");
  console.log("   ✅ IPFS metadata storage");
  console.log("   ✅ Multi-token support (USDC/USDT/DAI)");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
