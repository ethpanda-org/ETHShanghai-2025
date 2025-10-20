/**
 * 测试 getContributorInfo 函数返回值
 */

const hre = require("hardhat");

const CONTRACTS = {
  PUBLIC_GOODS_FUND_V2: '0xa3CA872b3876FbC2a6759256e57583A25555B4Cb',
};

async function main() {
  console.log("\n🧪 测试 getContributorInfo 函数\n");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  const userAddress = deployer.address;

  console.log(`\n测试地址: ${userAddress}`);
  console.log(`合约地址: ${CONTRACTS.PUBLIC_GOODS_FUND_V2}\n`);

  const publicGoodsFund = await hre.ethers.getContractAt(
    "PublicGoodsFundV2",
    CONTRACTS.PUBLIC_GOODS_FUND_V2
  );

  // 1. 直接读取 contributors mapping
  console.log("📊 步骤 1: 读取 contributors mapping\n");
  const contributorAmount = await publicGoodsFund.contributors(userAddress);
  console.log(`  contributors[${userAddress}]:`);
  console.log(`    value: ${contributorAmount.toString()}`);
  console.log(`    formatted: ${hre.ethers.utils.formatUnits(contributorAmount, 6)} USDC\n`);

  // 2. 调用 getContributorInfo 并详细查看返回值
  console.log("📊 步骤 2: 调用 getContributorInfo 并分析返回值\n");

  try {
    const result = await publicGoodsFund.getContributorInfo(userAddress);

    console.log("  原始返回值 (result):");
    console.log(`    类型: ${typeof result}`);
    console.log(`    是否为数组: ${Array.isArray(result)}`);
    console.log(`    长度: ${result.length}`);
    console.log(`    完整内容: ${JSON.stringify(result, null, 2)}\n`);

    console.log("  解析每个字段:\n");

    // Index 0: totalContributed
    console.log(`  result[0] (totalContributed):`);
    console.log(`    原始值: ${result[0]}`);
    console.log(`    类型: ${typeof result[0]}`);
    console.log(`    是否为 BigNumber: ${hre.ethers.BigNumber.isBigNumber(result[0])}`);
    if (hre.ethers.BigNumber.isBigNumber(result[0])) {
      console.log(`    toString: ${result[0].toString()}`);
      console.log(`    格式化: ${hre.ethers.utils.formatUnits(result[0], 6)} USDC`);
    }
    console.log(`    Number(result[0]) / 1e6 = ${Number(result[0]) / 1e6}\n`);

    // Index 1: lastContributionTime
    console.log(`  result[1] (lastContributionTime):`);
    console.log(`    原始值: ${result[1]}`);
    console.log(`    类型: ${typeof result[1]}`);
    console.log(`    toString: ${result[1].toString()}`);
    console.log(`    Number: ${Number(result[1])}\n`);

    // Index 2: badgeLevel
    console.log(`  result[2] (badgeLevel):`);
    console.log(`    原始值: ${result[2]}`);
    console.log(`    类型: ${typeof result[2]}`);
    console.log(`    内容: "${result[2]}"\n`);

    // 3. 模拟前端的解析逻辑
    console.log("📊 步骤 3: 模拟前端解析逻辑\n");
    const totalDonation = result ? Number(result[0]) / 1e6 : 0;
    const lastContribution = result ? Number(result[1]) : 0;
    const badgeLevelString = result ? result[2] : 'None';

    console.log(`  totalDonation = ${totalDonation}`);
    console.log(`  lastContribution = ${lastContribution}`);
    console.log(`  badgeLevelString = "${badgeLevelString}"\n`);

    // 4. 检查 badge 逻辑
    const badgeNames = ['None', 'Bronze', 'Silver', 'Gold'];
    const badgeLevel = badgeNames.indexOf(badgeLevelString) >= 0 ? badgeNames.indexOf(badgeLevelString) : 0;
    const badgeName = badgeNames[badgeLevel];

    console.log("📊 步骤 4: Badge 解析\n");
    console.log(`  badgeNames.indexOf("${badgeLevelString}") = ${badgeNames.indexOf(badgeLevelString)}`);
    console.log(`  badgeLevel = ${badgeLevel}`);
    console.log(`  badgeName = "${badgeName}"\n`);

  } catch (error) {
    console.log(`  ❌ 调用失败: ${error.message}\n`);
    console.log(`  完整错误:\n`, error);
  }

  console.log("=".repeat(70));
  console.log("\n✅ 测试完成\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
