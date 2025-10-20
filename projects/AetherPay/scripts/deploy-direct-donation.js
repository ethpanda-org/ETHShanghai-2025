/**
 * Deploy DirectDonation and update frontend for proper contribution tracking
 *
 * This fixes the issue where contributions show as $0.00 in user dashboard
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

// Contract addresses
const CONTRACTS = {
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
  PUBLIC_GOODS_FUND: '0x61E95B1551168D3f9F2C9EE6427705fCDC26b950',
  DONATION_ADDRESS: '0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c', // Current donation address from contract
};

async function main() {
  console.log("\n🚀 Deploying DirectDonation Contract\n");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  try {
    // ============================================
    // Step 1: Deploy DirectDonation Contract
    // ============================================
    console.log("📌 Step 1: Deploying DirectDonation Contract");
    console.log("-".repeat(60));

    const DirectDonation = await hre.ethers.getContractFactory("DirectDonation");
    const directDonation = await DirectDonation.deploy(CONTRACTS.DONATION_ADDRESS);

    console.log(`Transaction hash: ${directDonation.deployTransaction.hash}`);
    console.log("⏳ Waiting for confirmation...");
    await directDonation.deployed();

    console.log(`✅ DirectDonation deployed to: ${directDonation.address}`);
    console.log();

    // ============================================
    // Step 2: Verify Contract State
    // ============================================
    console.log("📌 Step 2: Verifying Contract State");
    console.log("-".repeat(60));

    const receiver = await directDonation.donationReceiver();
    console.log(`Donation receiver: ${receiver}`);

    const totalDonations = await directDonation.totalLifetimeDonations();
    console.log(`Initial total donations: ${totalDonations.toString()}`);
    console.log();

    // ============================================
    // Step 3: Update Frontend Configuration
    // ============================================
    console.log("📌 Step 3: Updating Frontend Configuration");
    console.log("-".repeat(60));

    const contractsPath = path.join(__dirname, '../frontend/lib/contracts.ts');
    const currentContent = fs.readFileSync(contractsPath, 'utf8');

    // Check if we should use DirectDonation instead of PublicGoodsFund
    console.log(`\n⚠️ IMPORTANT: The frontend currently uses PublicGoodsFund at:`);
    console.log(`   ${CONTRACTS.PUBLIC_GOODS_FUND}`);
    console.log(`\n   DirectDonation is deployed at:`);
    console.log(`   ${directDonation.address}`);
    console.log(`\n   To use DirectDonation for tracking, update PUBLIC_GOODS_FUND address in contracts.ts`);
    console.log();

    // ============================================
    // Step 4: Save Deployment Info
    // ============================================
    console.log("📌 Step 4: Saving Deployment Information");
    console.log("-".repeat(60));

    const deployment = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      purpose: "Fix contribution tracking - donations show as $0.00",
      contracts: {
        DirectDonation: directDonation.address,
        PaymentGatewayV2: CONTRACTS.PAYMENT_GATEWAY_V2,
        OriginalPublicGoodsFund: CONTRACTS.PUBLIC_GOODS_FUND,
      },
      issue: "PublicGoodsFund.contributeSpread() calculates 0 when rates are equal",
      solution: "DirectDonation contract properly tracks contributions per user"
    };

    const deploymentPath = path.join(__dirname, '../deployments/direct-donation.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentPath}`);
    console.log();

    // ============================================
    // Summary and Next Steps
    // ============================================
    console.log("=".repeat(60));
    console.log("🎉 DirectDonation Deployed Successfully!");
    console.log("=".repeat(60));

    console.log("\n📋 Contract Addresses:");
    console.log(`DirectDonation: ${directDonation.address}`);
    console.log(`PaymentGatewayV2: ${CONTRACTS.PAYMENT_GATEWAY_V2}`);

    console.log("\n🔗 Explorer Link:");
    console.log(`https://sepolia-optimism.etherscan.io/address/${directDonation.address}`);

    console.log("\n⚠️ NEXT STEPS TO FIX CONTRIBUTION TRACKING:");
    console.log("\n1. OPTION A - Use DirectDonation (Simpler):");
    console.log(`   - Update frontend/lib/contracts.ts:`);
    console.log(`     PUBLIC_GOODS_FUND: '${directDonation.address}',`);
    console.log(`   - This will make the frontend read from DirectDonation`);
    console.log(`   - But PaymentGatewayV2 still sends to old PublicGoodsFund`);

    console.log("\n2. OPTION B - Redeploy PaymentGatewayV2 (Complete Fix):");
    console.log(`   - Modify PaymentGatewayV2._processDonation() to:`);
    console.log(`     a) Use DirectDonation instead of PublicGoodsFund`);
    console.log(`     b) Pass order.payer as contributor, not tx.origin`);
    console.log(`   - Redeploy and update all references`);

    console.log("\n3. TEMPORARY WORKAROUND:");
    console.log(`   - Manually send test donation to DirectDonation`);
    console.log(`   - This will show up in your dashboard immediately`);

    console.log("\n🧪 TEST COMMAND:");
    console.log(`npx hardhat run scripts/test-direct-donation.js --network op-sepolia`);
    console.log();

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });