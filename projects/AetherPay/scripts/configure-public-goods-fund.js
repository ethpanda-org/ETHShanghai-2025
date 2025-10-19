const { ethers } = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🔧 Configuring PublicGoodsFund for PaymentGatewayV2");
  console.log("=".repeat(70) + "\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Configuring with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // ============ Contract Addresses ============
  const PUBLIC_GOODS_FUND = "0xCc9b8861CB2e42A043376433A73F2f019A7B2e1B";

  // Token addresses
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";
  const DAI = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";

  console.log("📋 Configuration:");
  console.log("   PublicGoodsFund:", PUBLIC_GOODS_FUND);
  console.log("");

  // 获取 PublicGoodsFund 合约实例
  const PublicGoodsFund = await ethers.getContractFactory("PublicGoodsFund");
  const publicGoodsFund = PublicGoodsFund.attach(PUBLIC_GOODS_FUND);

  console.log("⏳ Checking and adding supported tokens to PublicGoodsFund...\n");

  // 检查并添加 USDC
  let isSupported = await publicGoodsFund.supportedTokens(MOCK_USDC);
  if (!isSupported) {
    console.log("   ⏳ Adding USDC...");
    let tx = await publicGoodsFund.addSupportedToken(MOCK_USDC);
    await tx.wait();
    console.log("   ✅ USDC added:", MOCK_USDC);
  } else {
    console.log("   ✅ USDC already supported:", MOCK_USDC);
  }

  // 检查并添加 USDT
  isSupported = await publicGoodsFund.supportedTokens(MOCK_USDT);
  if (!isSupported) {
    console.log("   ⏳ Adding USDT...");
    let tx = await publicGoodsFund.addSupportedToken(MOCK_USDT);
    await tx.wait();
    console.log("   ✅ USDT added:", MOCK_USDT);
  } else {
    console.log("   ✅ USDT already supported:", MOCK_USDT);
  }

  // 检查并添加 DAI
  isSupported = await publicGoodsFund.supportedTokens(DAI);
  if (!isSupported) {
    console.log("   ⏳ Adding DAI...");
    let tx = await publicGoodsFund.addSupportedToken(DAI);
    await tx.wait();
    console.log("   ✅ DAI added:", DAI);
  } else {
    console.log("   ✅ DAI already supported:", DAI);
  }

  console.log("");

  // 获取当前轮次信息
  console.log("📊 Current Round Info:");
  const roundInfo = await publicGoodsFund.getCurrentRoundInfo();
  console.log("   Round ID:        ", roundInfo.roundId.toString());
  console.log("   Total Donated:   ", ethers.utils.formatUnits(roundInfo.totalDonated, 6), "USDC");
  console.log("   Start Time:      ", new Date(roundInfo.startTime.toNumber() * 1000).toLocaleString());
  console.log("   End Time:        ", new Date(roundInfo.endTime.toNumber() * 1000).toLocaleString());
  console.log("   Distributed:     ", roundInfo.distributed ? "Yes" : "No");
  console.log("");

  // 获取统计信息
  const totalLifetimeDonations = await publicGoodsFund.totalLifetimeDonations();
  const totalTransactions = await publicGoodsFund.totalTransactions();
  const totalContributors = await publicGoodsFund.getTotalContributors();

  console.log("📈 Global Statistics:");
  console.log("   Total Donations: ", ethers.utils.formatUnits(totalLifetimeDonations, 6), "USDC");
  console.log("   Total Txs:       ", totalTransactions.toString());
  console.log("   Contributors:    ", totalContributors.toString());
  console.log("");

  console.log("=".repeat(70));
  console.log("✅ PublicGoodsFund Configuration Complete!");
  console.log("=".repeat(70) + "\n");

  console.log("📝 Next Steps:");
  console.log("   1. Deploy PaymentGatewayV2 with PublicGoodsFund integration");
  console.log("   2. Test cross-currency payment (e.g., USDC → USDT)");
  console.log("   3. Verify spread donation appears in PublicGoodsFund");
  console.log("   4. Check contributor badge awards");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Configuration failed:");
    console.error(error);
    process.exit(1);
  });
