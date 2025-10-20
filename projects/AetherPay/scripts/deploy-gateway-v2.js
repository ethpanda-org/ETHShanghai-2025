const { ethers } = require("hardhat");

async function main() {
  console.log("\n=================================================");
  console.log("🚀 Deploying PaymentGatewayV2 to OP Sepolia...");
  console.log("=================================================\n");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // 现有合约地址（OP Sepolia）
  const FX_ROUTER = "0xC2ab12Baf3735864528F890B809Ffe2f1cf2f8d1";
  const TREASURY = deployer.address; // 使用部署者地址作为金库
  const DONATION = deployer.address; // 临时使用部署者地址（后续可更改）
  const PUBLIC_GOODS_FUND = "0xCc9b8861CB2e42A043376433A73F2f019A7B2e1B"; // 🆕 PublicGoodsFund 地址
  const AETHER_ORACLE_V2 = "0x1D323b80710c1d0c833B920CB7Ace09c49e237d7"; // 🆕 AetherOracleV2 地址

  console.log("📋 Configuration:");
  console.log("   FXRouter:", FX_ROUTER);
  console.log("   Treasury:", TREASURY);
  console.log("   Donation:", DONATION);
  console.log("   PublicGoodsFund:", PUBLIC_GOODS_FUND);
  console.log("   AetherOracleV2:", AETHER_ORACLE_V2);
  console.log("");

  // 部署 PaymentGatewayV2
  console.log("⏳ Deploying PaymentGatewayV2...");
  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");

  const gateway = await PaymentGatewayV2.deploy(
    FX_ROUTER,
    TREASURY,
    DONATION,
    PUBLIC_GOODS_FUND,  // 🆕 第4个参数
    AETHER_ORACLE_V2    // 🆕 第5个参数
  );

  await gateway.deployed();

  console.log("✅ PaymentGatewayV2 deployed to:", gateway.address);
  console.log("");

  // 等待几个区块确认
  console.log("⏳ Waiting for block confirmations...");
  await gateway.deployTransaction.wait(3);
  console.log("✅ Confirmed!\n");

  // 添加支持的代币
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  console.log("⏳ Adding supported tokens...");

  const tx1 = await gateway.addSupportedToken(MOCK_USDC);
  await tx1.wait();
  console.log("   ✅ USDC added:", MOCK_USDC);

  const tx2 = await gateway.addSupportedToken(MOCK_USDT);
  await tx2.wait();
  console.log("   ✅ USDT added:", MOCK_USDT);
  console.log("");

  // 保存部署信息
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
      PublicGoodsFund: PUBLIC_GOODS_FUND,  // 🆕
      AetherOracleV2: AETHER_ORACLE_V2,    // 🆕
      SupportedTokens: {
        USDC: MOCK_USDC,
        USDT: MOCK_USDT
      }
    },
    blockNumber: await ethers.provider.getBlockNumber(),
    gasUsed: gateway.deployTransaction.gasLimit.toString()
  };

  fs.writeFileSync(
    'deployment-gateway-v2.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployment-gateway-v2.json\n");

  console.log("=================================================");
  console.log("🎉 Deployment Complete!");
  console.log("=================================================\n");

  console.log("📋 Contract Addresses:");
  console.log("   PaymentGatewayV2:", gateway.address);
  console.log("   FXRouter:", FX_ROUTER);
  console.log("");

  console.log("🔗 Etherscan URLs:");
  console.log("   Gateway:", `https://sepolia-optimism.etherscan.io/address/${gateway.address}`);
  console.log("");

  console.log("📝 Next Steps:");
  console.log("   1. Verify contract on Etherscan:");
  console.log(`      npx hardhat verify --network opSepolia ${gateway.address} "${FX_ROUTER}" "${TREASURY}" "${DONATION}" "${PUBLIC_GOODS_FUND}" "${AETHER_ORACLE_V2}"`);
  console.log("");
  console.log("   2. Update frontend contracts.ts with new address");
  console.log("");
  console.log("   3. Register as merchant and test!");
  console.log("");

  // 输出更新前端配置的命令
  console.log("🔧 Frontend Update Command:");
  console.log("   Edit frontend/lib/contracts.ts:");
  console.log(`   PAYMENT_GATEWAY_V2: '${gateway.address}',`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
