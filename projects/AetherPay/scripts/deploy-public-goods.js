const { ethers } = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Deploying PublicGoodsFund Contract");
  console.log("=".repeat(60) + "\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying from address:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy PublicGoodsFund
  const PublicGoodsFund = await ethers.getContractFactory("PublicGoodsFund");
  console.log("\n⏳ Deploying PublicGoodsFund...");

  const publicGoodsFund = await PublicGoodsFund.deploy();
  await publicGoodsFund.deployed();

  console.log("✅ PublicGoodsFund deployed to:", publicGoodsFund.address);

  // Get existing contract addresses
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  // Add supported tokens
  console.log("\n⏳ Adding supported tokens...");

  let tx = await publicGoodsFund.addSupportedToken(MOCK_USDC);
  await tx.wait();
  console.log("✅ Added MOCK_USDC:", MOCK_USDC);

  tx = await publicGoodsFund.addSupportedToken(MOCK_USDT);
  await tx.wait();
  console.log("✅ Added MOCK_USDT:", MOCK_USDT);

  // Add public goods projects
  console.log("\n⏳ Adding public goods projects...");

  // Ethereum Foundation Grants
  tx = await publicGoodsFund.addPublicGood(
    "Ethereum Foundation Grants",
    "0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C" // 使用已有的 donation address
  );
  await tx.wait();
  console.log("✅ Added: Ethereum Foundation Grants");

  // Geth Development (placeholder address)
  tx = await publicGoodsFund.addPublicGood(
    "Geth Development",
    "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c" // deployer address as placeholder
  );
  await tx.wait();
  console.log("✅ Added: Geth Development");

  // Optimism Public Goods
  tx = await publicGoodsFund.addPublicGood(
    "Optimism Public Goods",
    "0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C"
  );
  await tx.wait();
  console.log("✅ Added: Optimism Public Goods");

  // Set recipients for current round
  console.log("\n⏳ Setting round recipients...");

  const recipients = [
    "0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C", // EF Grants
    "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c", // Geth
    "0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C"  // Optimism
  ];

  const allocations = [
    4000,  // 40% to EF Grants
    3000,  // 30% to Geth
    3000   // 30% to Optimism
  ];

  tx = await publicGoodsFund.setRoundRecipients(recipients, allocations);
  await tx.wait();
  console.log("✅ Round recipients configured");

  // Get current round info
  const roundInfo = await publicGoodsFund.getCurrentRoundInfo();
  console.log("\n📊 Current Round Info:");
  console.log("   - Round ID:", roundInfo.roundId.toString());
  console.log("   - Start Time:", new Date(roundInfo.startTime.toNumber() * 1000).toLocaleString());
  console.log("   - End Time:", new Date(roundInfo.endTime.toNumber() * 1000).toLocaleString());
  console.log("   - Total Donated:", ethers.utils.formatUnits(roundInfo.totalDonated, 6), "USDC");

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "op-sepolia",
    publicGoodsFund: publicGoodsFund.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    supportedTokens: {
      MOCK_USDC,
      MOCK_USDT
    },
    publicGoods: [
      { id: 0, name: "Ethereum Foundation Grants" },
      { id: 1, name: "Geth Development" },
      { id: 2, name: "Optimism Public Goods" }
    ],
    currentRound: {
      roundId: roundInfo.roundId.toString(),
      recipients: recipients,
      allocations: allocations
    },
    explorer: `https://sepolia-optimistic.etherscan.io/address/${publicGoodsFund.address}`
  };

  fs.writeFileSync(
    'deployments/public-goods-deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n" + "=".repeat(60));
  console.log("✅ PublicGoodsFund Deployment Completed!");
  console.log("=".repeat(60));
  console.log("\n📋 Deployment Summary:");
  console.log("   - Contract:", publicGoodsFund.address);
  console.log("   - Explorer:", deploymentInfo.explorer);
  console.log("   - Config saved to: deployments/public-goods-deployment.json");
  console.log("\n💡 Next Steps:");
  console.log("   1. Update FXPool to integrate PublicGoodsFund");
  console.log("   2. Add PublicGoodsFund address to frontend contracts.ts");
  console.log("   3. Develop public goods dashboard");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
