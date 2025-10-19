const { ethers } = require("hardhat");

async function main() {
  console.log("\n=================================================");
  console.log("🔧 Adding Supported Tokens to PaymentGatewayV2");
  console.log("=================================================\n");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 Operating with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // PaymentGatewayV2 address
  const PAYMENT_GATEWAY_V2 = "0x26Fea37ec7D0Fe6858C9209044F715b549bAD343";

  // 获取合约实例
  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
  const gateway = await PaymentGatewayV2.attach(PAYMENT_GATEWAY_V2);

  console.log("📋 Gateway Contract:", PAYMENT_GATEWAY_V2);
  console.log("");

  // Token addresses to add (from deployment-gateway-v2.json and contracts.ts)
  const tokensToAdd = [
    {
      name: "USDC (Mock)",
      address: "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3",
      description: "Already added during deployment"
    },
    {
      name: "USDT (Mock)",
      address: "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C",
      description: "Already added during deployment"
    },
    {
      name: "DAI",
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      description: "Real DAI on OP Sepolia - needs to be added"
    }
  ];

  console.log("⏳ Adding supported tokens...\n");

  for (const token of tokensToAdd) {
    try {
      // Check if token is already supported
      const isSupported = await gateway.supportedTokens(token.address);

      if (isSupported) {
        console.log(`   ✅ ${token.name} (${token.address})`);
        console.log(`      Status: Already supported`);
      } else {
        console.log(`   ⏳ ${token.name} (${token.address})`);
        console.log(`      Status: Adding...`);

        const tx = await gateway.addSupportedToken(token.address);
        await tx.wait();

        console.log(`   ✅ Successfully added!`);
        console.log(`      Tx hash: ${tx.hash}`);
      }
      console.log("");
    } catch (error) {
      console.error(`   ❌ Failed to add ${token.name}:`, error.message);
      console.log("");
    }
  }

  // Verify all tokens are supported
  console.log("🔍 Final verification:\n");
  for (const token of tokensToAdd) {
    const isSupported = await gateway.supportedTokens(token.address);
    console.log(`   ${isSupported ? '✅' : '❌'} ${token.name}: ${isSupported ? 'Supported' : 'NOT supported'}`);
  }
  console.log("");

  console.log("=================================================");
  console.log("🎉 Token Configuration Complete!");
  console.log("=================================================\n");

  console.log("📝 Summary:");
  console.log("   ✅ USDC: 0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3");
  console.log("   ✅ USDT: 0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C");
  console.log("   ✅ DAI:  0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1");
  console.log("");

  console.log("📝 Next Steps:");
  console.log("   1. Test creating an order with USDC/USDT pair");
  console.log("   2. Make sure to register as merchant first!");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Operation failed:");
    console.error(error);
    process.exit(1);
  });
