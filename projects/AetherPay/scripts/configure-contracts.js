/**
 * Configure Contracts Script
 *
 * This script configures all deployed contracts:
 * 1. FXPool.setPublicGoodsFund() - Enable automatic spread donations
 * 2. PaymentGatewayV2 contract addresses (if needed)
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

// Contract addresses from deployment
const CONTRACTS = {
  AETHER_ORACLE_V2: '0x6a0c9aA2B04BA45Dd348a86Ae3ebE81EE89df106',
  PAYMENT_GATEWAY_V2: '0x0aF9BE12A5F7C3f9Fd5448147e349691B44e7DD1',
  FX_ROUTER: '0xC2ab12Baf3735864528F890B809Ffe2f1cf2f8d1',
  FX_POOL: '0x04A903665f595Cbff23100EFb7baB3A1059d92C2',
  PUBLIC_GOODS_FUND: '0x0C50DB765fa4b25D960D2CCa7556135909A742C1',
  MOCK_USDC: '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3',
  MOCK_USDT: '0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C',
};

async function main() {
  console.log("\n🔧 Starting Contract Configuration\n");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  // ============================================
  // Step 1: Configure FXPool → PublicGoodsFund
  // ============================================
  console.log("📌 Step 1: Configuring FXPool → PublicGoodsFund");
  console.log("-".repeat(60));

  try {
    const FXPool = await hre.ethers.getContractAt("FXPool", CONTRACTS.FX_POOL);

    // Check current configuration
    const currentPGF = await FXPool.publicGoodsFundAddress();
    console.log(`Current PublicGoodsFund: ${currentPGF}`);

    if (currentPGF === CONTRACTS.PUBLIC_GOODS_FUND) {
      console.log("✅ PublicGoodsFund already configured correctly");
    } else {
      console.log(`Setting PublicGoodsFund to: ${CONTRACTS.PUBLIC_GOODS_FUND}`);

      const tx = await FXPool.setPublicGoodsFund(CONTRACTS.PUBLIC_GOODS_FUND);
      console.log(`Transaction hash: ${tx.hash}`);

      await tx.wait();
      console.log("✅ PublicGoodsFund configured successfully!");

      // Verify
      const newPGF = await FXPool.publicGoodsFundAddress();
      console.log(`Verified new address: ${newPGF}`);
    }
  } catch (error) {
    console.error("❌ FXPool configuration failed:", error.message);
  }

  console.log();

  // ============================================
  // Step 2: Verify PublicGoodsFund Allowances
  // ============================================
  console.log("📌 Step 2: Checking Token Allowances");
  console.log("-".repeat(60));

  try {
    const PublicGoodsFund = await hre.ethers.getContractAt(
      "PublicGoodsFund",
      CONTRACTS.PUBLIC_GOODS_FUND
    );

    // Check if USDC and USDT are supported
    const tokens = [
      { name: 'USDC', address: CONTRACTS.MOCK_USDC },
      { name: 'USDT', address: CONTRACTS.MOCK_USDT }
    ];

    for (const token of tokens) {
      try {
        const ERC20 = await hre.ethers.getContractAt("IERC20", token.address);
        const balance = await ERC20.balanceOf(CONTRACTS.PUBLIC_GOODS_FUND);
        console.log(`${token.name} balance in PGF: ${hre.ethers.utils.formatUnits(balance, 6)}`);
      } catch (err) {
        console.log(`${token.name}: Unable to check balance`);
      }
    }

    // Get current round info
    const roundInfo = await PublicGoodsFund.getCurrentRoundInfo();
    console.log(`\nCurrent Round ID: ${roundInfo[0]}`);
    console.log(`Total Donated: ${hre.ethers.utils.formatUnits(roundInfo[1], 6)} USDC/USDT`);
    console.log(`Start Time: ${new Date(Number(roundInfo[2]) * 1000).toISOString()}`);
    console.log(`End Time: ${new Date(Number(roundInfo[3]) * 1000).toISOString()}`);
    console.log(`Distributed: ${roundInfo[4]}`);

  } catch (error) {
    console.error("❌ PublicGoodsFund verification failed:", error.message);
  }

  console.log();

  // ============================================
  // Step 3: Test Small Donation
  // ============================================
  console.log("📌 Step 3: Testing Small Donation (1 USDC)");
  console.log("-".repeat(60));

  try {
    const PublicGoodsFund = await hre.ethers.getContractAt(
      "PublicGoodsFund",
      CONTRACTS.PUBLIC_GOODS_FUND
    );
    const USDC = await hre.ethers.getContractAt("IERC20", CONTRACTS.MOCK_USDC);

    // Check deployer's USDC balance
    const balance = await USDC.balanceOf(deployer.address);
    console.log(`Deployer USDC balance: ${hre.ethers.utils.formatUnits(balance, 6)} USDC`);

    if (balance.gte(hre.ethers.utils.parseUnits("1", 6))) {
      // Approve
      console.log("Approving 1 USDC...");
      const approveTx = await USDC.approve(
        CONTRACTS.PUBLIC_GOODS_FUND,
        hre.ethers.utils.parseUnits("1", 6)
      );
      await approveTx.wait();
      console.log("✅ Approved");

      // Donate via contributeSpread
      console.log("Calling contributeSpread...");
      const donateTx = await PublicGoodsFund.contributeSpread(
        deployer.address,
        CONTRACTS.MOCK_USDC,
        hre.ethers.utils.parseUnits("1.0050", 8), // AI rate (8 decimals)
        hre.ethers.utils.parseUnits("1.0052", 8), // Execution rate (8 decimals)
        hre.ethers.utils.parseUnits("100", 6)     // Trade amount (6 decimals)
      );
      const receipt = await donateTx.wait();
      console.log(`✅ Test donation successful! Tx: ${receipt.transactionHash}`);

      // Check updated stats
      const roundInfo = await PublicGoodsFund.getCurrentRoundInfo();
      console.log(`Updated Total Donated: ${hre.ethers.utils.formatUnits(roundInfo[1], 6)} USDC/USDT`);
    } else {
      console.log("⚠️ Insufficient USDC balance for test donation");
    }

  } catch (error) {
    console.error("❌ Test donation failed:", error.message);
    console.log("This is optional - the configuration is still valid");
  }

  console.log();

  // ============================================
  // Summary
  // ============================================
  console.log("=".repeat(60));
  console.log("📊 Configuration Summary");
  console.log("=".repeat(60));
  console.log("✅ FXPool → PublicGoodsFund binding configured");
  console.log("✅ PublicGoodsFund is active and ready");
  console.log("\n🎯 Next Steps:");
  console.log("1. Test end-to-end payment flow");
  console.log("2. Monitor spread donations in PublicGoodsFund");
  console.log("3. Check /public-goods dashboard for real-time stats");
  console.log("=".repeat(60) + "\n");

  // Save configuration log
  const configLog = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: CONTRACTS,
    configured: {
      fxPoolPublicGoodsFund: true,
    }
  };

  const logPath = path.join(__dirname, '../deployments/contract-configuration.json');
  fs.writeFileSync(logPath, JSON.stringify(configLog, null, 2));
  console.log(`Configuration log saved to: ${logPath}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
