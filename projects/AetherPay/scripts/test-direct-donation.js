/**
 * Test DirectDonation contract by manually adding a contribution
 *
 * This will immediately show up in your user dashboard
 */

const hre = require("hardhat");

// Contract addresses
const CONTRACTS = {
  DIRECT_DONATION: '0x947E33354FFf059b875E97e8daD32e39c1e59004',
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
};

async function main() {
  console.log("\n🧪 Testing DirectDonation Contract\n");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Test account: ${deployer.address}`);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`ETH Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  try {
    // Connect to contracts
    const DirectDonation = await hre.ethers.getContractFactory("DirectDonation");
    const donation = DirectDonation.attach(CONTRACTS.DIRECT_DONATION);

    const MockToken = await hre.ethers.getContractFactory("MockERC20");
    const usdc = MockToken.attach(CONTRACTS.MOCK_USDC);

    // Check USDC balance
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log(`USDC Balance: ${(usdcBalance / 1e6).toFixed(2)} USDC`);

    if (usdcBalance.eq(0)) {
      console.log("\n⚠️ No USDC balance. Minting some for testing...");
      const mintTx = await usdc.mint(deployer.address, hre.ethers.utils.parseUnits("1000", 6));
      await mintTx.wait();
      console.log("✅ Minted 1000 USDC");
    }

    // Check current contribution status
    console.log("\n📊 Current Contribution Status:");
    console.log("-".repeat(40));

    const beforeInfo = await donation.getContributorInfo(deployer.address);
    console.log(`Total contributed: $${(beforeInfo.totalContributed / 1e6).toFixed(2)}`);
    console.log(`Badge level: ${beforeInfo.badgeLevel}`);
    console.log(`Last contribution: ${beforeInfo.lastTime > 0 ? new Date(beforeInfo.lastTime * 1000).toLocaleString() : 'Never'}`);

    // Make a test contribution
    const testAmount = hre.ethers.utils.parseUnits("200", 6); // $200 USDC
    console.log(`\n💰 Making test contribution of $200...`);

    // Approve DirectDonation to spend USDC
    console.log("1. Approving USDC...");
    const approveTx = await usdc.approve(CONTRACTS.DIRECT_DONATION, testAmount);
    await approveTx.wait();
    console.log("✅ Approved");

    // Make the contribution
    console.log("2. Sending contribution...");
    const contributeTx = await donation.contributeDonation(
      deployer.address,  // contributor (you)
      CONTRACTS.MOCK_USDC,  // token
      testAmount  // amount
    );
    const receipt = await contributeTx.wait();
    console.log(`✅ Contribution sent!`);
    console.log(`   Transaction: ${receipt.transactionHash}`);

    // Check updated status
    console.log("\n📊 Updated Contribution Status:");
    console.log("-".repeat(40));

    const afterInfo = await donation.getContributorInfo(deployer.address);
    console.log(`Total contributed: $${(afterInfo.totalContributed / 1e6).toFixed(2)}`);
    console.log(`Badge level: ${afterInfo.badgeLevel}`);
    console.log(`Last contribution: ${new Date(afterInfo.lastTime * 1000).toLocaleString()}`);

    // Check contract totals
    const totalDonations = await donation.totalLifetimeDonations();
    const totalContributors = await donation.getTotalContributors();
    console.log(`\n📈 Contract Statistics:`);
    console.log(`Total donations: $${(totalDonations / 1e6).toFixed(2)}`);
    console.log(`Total contributors: ${totalContributors}`);

    // ============================================
    // Summary
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Test Complete!");
    console.log("=".repeat(60));

    console.log("\n✅ SUCCESS! Your contribution has been recorded.");
    console.log("\n🌐 Check your dashboard at:");
    console.log("   http://localhost:3000/user");
    console.log("\n📊 You should now see:");
    console.log(`   - Total Contributions: $${(afterInfo.totalContributed / 1e6).toFixed(2)}`);
    console.log(`   - Current Badge: ${afterInfo.badgeLevel}`);

    if (afterInfo.badgeLevel === "Bronze" && beforeInfo.badgeLevel === "None") {
      console.log("\n🏆 Congratulations! You've earned the Bronze badge!");
    }

    console.log("\n💡 Badge Thresholds:");
    console.log("   - Bronze: $100+");
    console.log("   - Silver: $500+");
    console.log("   - Gold: $2000+");
    console.log();

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });