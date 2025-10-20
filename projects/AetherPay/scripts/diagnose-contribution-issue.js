/**
 * Fix Public Goods Contribution Tracking
 *
 * Problem: Total Contributions shows $0.00 because PublicGoodsFund.contributeSpread()
 * expects a rate difference but PaymentGatewayV2 passes same rates (1e8, 1e8)
 * resulting in 0 spread calculation.
 *
 * Solution: Deploy fixed PaymentGatewayV2 that properly tracks donations
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

// Contract addresses
const CONTRACTS = {
  // Current contracts
  OLD_PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
  PUBLIC_GOODS_FUND: '0x61E95B1551168D3f9F2C9EE6427705fCDC26b950',
  FX_ROUTER: '0x94e3dFEF2c19e2cFf0D2CC6F5801C7ceC3927663',
  AETHER_ORACLE_V2: '0x6a0c9aA2B04BA45Dd348a86Ae3ebE81EE89df106',

  // Tokens
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
  MOCK_USDT: '0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2',
};

async function main() {
  console.log("\n🔧 Fixing Public Goods Contribution Tracking\n");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  try {
    // ============================================
    // Step 1: Check current PublicGoodsFund state
    // ============================================
    console.log("📌 Step 1: Checking PublicGoodsFund State");
    console.log("-".repeat(60));

    const PublicGoodsFund = await hre.ethers.getContractFactory("contracts/PublicGoodsFund.sol:PublicGoodsFund");
    const fund = PublicGoodsFund.attach(CONTRACTS.PUBLIC_GOODS_FUND);

    // Check if tokens are supported
    const usdcSupported = await fund.supportedTokens(CONTRACTS.MOCK_USDC);
    const usdtSupported = await fund.supportedTokens(CONTRACTS.MOCK_USDT);

    console.log(`USDC supported in fund: ${usdcSupported}`);
    console.log(`USDT supported in fund: ${usdtSupported}`);

    if (!usdcSupported || !usdtSupported) {
      console.log("\n⚠️ Adding missing token support to PublicGoodsFund...");

      if (!usdcSupported) {
        const tx1 = await fund.addSupportedToken(CONTRACTS.MOCK_USDC);
        await tx1.wait();
        console.log("✅ USDC added to PublicGoodsFund");
      }

      if (!usdtSupported) {
        const tx2 = await fund.addSupportedToken(CONTRACTS.MOCK_USDT);
        await tx2.wait();
        console.log("✅ USDT added to PublicGoodsFund");
      }
    }

    // Check total donations
    const totalDonations = await fund.totalLifetimeDonations();
    console.log(`\nCurrent total donations: $${(totalDonations / 1e6).toFixed(2)}`);

    // Check contributor info for deployer
    const contributorInfo = await fund.getContributorInfo(deployer.address);
    console.log(`\nDeployer contribution info:`);
    console.log(`- Total contributed: $${(contributorInfo.totalContributed / 1e6).toFixed(2)}`);
    console.log(`- Badge level: ${contributorInfo.badgeLevel}`);
    console.log();

    // ============================================
    // Step 2: Test direct donation to understand the issue
    // ============================================
    console.log("📌 Step 2: Testing Direct Donation Mechanism");
    console.log("-".repeat(60));

    console.log("\nThe issue: PublicGoodsFund.contributeSpread() expects rate difference");
    console.log("When aiRate = executionRate, spread = 0, so no contribution is recorded!");
    console.log("\nCurrent call from PaymentGatewayV2:");
    console.log("- aiRate: 1e8 (1.0)");
    console.log("- executionRate: 1e8 (1.0)");
    console.log("- Result: (1e8 - 1e8) = 0 spread → $0 contribution!");

    // ============================================
    // Step 3: Workaround - Call with adjusted rates
    // ============================================
    console.log("\n📌 Step 3: Implementing Workaround");
    console.log("-".repeat(60));

    console.log("\n🔧 WORKAROUND: Use slightly different rates to create non-zero spread");
    console.log("- aiRate: 1e8 (1.00000000)");
    console.log("- executionRate: 1.0001e8 (1.00010000) - 0.01% higher");
    console.log("- This creates 0.01% spread that equals the donation amount\n");

    // Test with mock donation
    const MockToken = await hre.ethers.getContractFactory("MockERC20");
    const usdc = MockToken.attach(CONTRACTS.MOCK_USDC);

    // Check USDC balance
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log(`Deployer USDC balance: ${(usdcBalance / 1e6).toFixed(2)}`);

    if (usdcBalance.gt(0)) {
      console.log("\n🧪 Testing donation with workaround rates...");

      // Approve fund to spend USDC
      const testAmount = hre.ethers.utils.parseUnits("1", 6); // 1 USDC
      const approveTx = await usdc.approve(CONTRACTS.PUBLIC_GOODS_FUND, testAmount);
      await approveTx.wait();
      console.log("✅ Approved 1 USDC for testing");

      // Call contributeSpread with adjusted rates
      // Use 10001/10000 rate difference (0.01% spread)
      const aiRate = hre.ethers.utils.parseUnits("1", 8); // 1e8
      const executionRate = hre.ethers.utils.parseUnits("1.0001", 8); // 1.0001e8

      console.log("Calling contributeSpread with:");
      console.log(`- Contributor: ${deployer.address}`);
      console.log(`- Token: USDC`);
      console.log(`- AI Rate: ${aiRate.toString()} (1.0)`);
      console.log(`- Execution Rate: ${executionRate.toString()} (1.0001)`);
      console.log(`- Trade Amount: ${testAmount.toString()} (1 USDC)`);

      try {
        const contributeTx = await fund.contributeSpread(
          deployer.address,
          CONTRACTS.MOCK_USDC,
          aiRate,
          executionRate,
          testAmount
        );
        const receipt = await contributeTx.wait();
        console.log("✅ Contribution successful!");
        console.log(`   Transaction: ${receipt.transactionHash}`);

        // Check updated contribution
        const newInfo = await fund.getContributorInfo(deployer.address);
        console.log(`\n📊 Updated contribution info:`);
        console.log(`- Total contributed: $${(newInfo.totalContributed / 1e6).toFixed(6)}`);
        console.log(`- Badge level: ${newInfo.badgeLevel}`);
      } catch (error) {
        console.error("❌ Contribution failed:", error.message);
      }
    }

    // ============================================
    // Step 4: Provide solution guidance
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("📋 DIAGNOSIS COMPLETE");
    console.log("=".repeat(60));

    console.log("\n🔍 ROOT CAUSE:");
    console.log("PaymentGatewayV2._processDonation() uses PublicGoodsFund.contributeSpread()");
    console.log("with equal rates (1e8, 1e8), resulting in 0 spread calculation.");

    console.log("\n✅ SOLUTION OPTIONS:");
    console.log("\n1. QUICK FIX (Recommended):");
    console.log("   Modify PaymentGatewayV2 to pass slightly different rates:");
    console.log("   - aiRate: 1e8");
    console.log("   - executionRate: (1e8 * (10000 + donationBps)) / 10000");
    console.log("   This creates the exact donation amount as 'spread'");

    console.log("\n2. PROPER FIX:");
    console.log("   Add a dedicated contributeFee() function to PublicGoodsFund");
    console.log("   that directly accepts donations without spread calculation");

    console.log("\n3. WORKAROUND:");
    console.log("   Send donations directly to donationAddress instead of PublicGoodsFund");
    console.log("   (loses tracking but ensures funds are received)");

    console.log("\n📝 Next Steps:");
    console.log("1. Deploy updated PaymentGatewayV2 with rate fix");
    console.log("2. Update frontend contracts.ts");
    console.log("3. Test new payments to verify contribution tracking");
    console.log();

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });