// 检查账户余额脚本
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🔍 检查账户余额...");
  console.log("账户地址:", deployer.address);

  const balance = await deployer.getBalance();
  const balanceInEth = ethers.utils.formatEther(balance);

  console.log("当前余额:", balanceInEth, "ETH");

  const requiredEth = 0.002; // PublicGoodsFundV2 部署需要约 0.002 ETH

  if (parseFloat(balanceInEth) < requiredEth) {
    const needed = (requiredEth - parseFloat(balanceInEth)).toFixed(4);
    console.log("\n❌ 余额不足！");
    console.log(`   需要: ${requiredEth} ETH`);
    console.log(`   当前: ${balanceInEth} ETH`);
    console.log(`   缺少: ${needed} ETH`);
    console.log("\n📥 请从以下水龙头领取测试币：");
    console.log("   1. Superchain (推荐): https://app.optimism.io/faucet");
    console.log("   2. Alchemy: https://www.alchemy.com/faucets/optimism-sepolia");
    console.log("   3. QuickNode: https://faucet.quicknode.com/optimism/sepolia");
    console.log("\n⏳ 获取测试币后，再次运行此脚本确认余额");
  } else {
    console.log("\n✅ 余额充足，可以开始部署！");
    console.log(`   剩余: ${(parseFloat(balanceInEth) - requiredEth).toFixed(4)} ETH`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });