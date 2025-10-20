/**
 * 分析已部署的 PublicGoodsFundV2 合约代码
 * 查看实际部署的字节码，确认是哪个版本
 */

const hre = require("hardhat");

const CONTRACTS = {
  PUBLIC_GOODS_FUND_V2: '0xb83aABD1ebFEefC0AeFbeDE5738d3894abD70C4D',
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
};

async function main() {
  console.log("\n🔍 分析已部署的 PublicGoodsFundV2 合约\n");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();

  // 连接到已部署的合约
  const PublicGoodsFundV2 = await hre.ethers.getContractFactory("PublicGoodsFundV2");
  const publicGoodsFund = PublicGoodsFundV2.attach(CONTRACTS.PUBLIC_GOODS_FUND_V2);

  console.log("📊 步骤 1: 检查合约字节码\n");

  const deployedCode = await hre.ethers.provider.getCode(CONTRACTS.PUBLIC_GOODS_FUND_V2);
  console.log(`已部署的字节码长度: ${deployedCode.length} bytes`);

  // 编译当前合约并获取字节码
  const compiledBytecode = PublicGoodsFundV2.bytecode;
  console.log(`当前编译的字节码长度: ${compiledBytecode.length} bytes`);

  if (deployedCode.length === compiledBytecode.length) {
    console.log("✅ 字节码长度匹配");
  } else {
    console.log("❌ 字节码长度不匹配 → 合约可能不是最新版本");
  }

  console.log("\n📊 步骤 2: 测试 contributeFee 函数\n");

  // 创建一个小额测试
  const testAmount = hre.ethers.utils.parseUnits("0.001", 6); // 0.001 USDC

  try {
    // 首先 mint 并授权 USDC
    const MockUSDC = await hre.ethers.getContractAt("MockERC20", CONTRACTS.MOCK_USDC);

    console.log("准备测试金额: 0.001 USDC");

    // Mint USDC 给 deployer
    await MockUSDC.mint(deployer.address, testAmount);
    console.log("✓ Mint 完成");

    // 授权 PublicGoodsFund
    await MockUSDC.approve(CONTRACTS.PUBLIC_GOODS_FUND_V2, testAmount);
    console.log("✓ 授权完成");

    // 检查初始状态
    const initialDonations = await publicGoodsFund.totalLifetimeDonations();
    const initialContribution = await publicGoodsFund.contributors(deployer.address);

    console.log(`\n初始状态:`);
    console.log(`  totalLifetimeDonations: ${hre.ethers.utils.formatUnits(initialDonations, 6)} USDC`);
    console.log(`  contributors[${deployer.address}]: ${hre.ethers.utils.formatUnits(initialContribution, 6)} USDC`);

    // 直接调用 contributeFee（模拟 PaymentGateway 的行为）
    console.log(`\n执行 contributeFee(${deployer.address}, ${CONTRACTS.MOCK_USDC}, ${testAmount})...`);

    const tx = await publicGoodsFund.contributeFee(
      deployer.address,
      CONTRACTS.MOCK_USDC,
      testAmount
    );
    const receipt = await tx.wait();

    console.log("✓ 交易成功");
    console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);

    // 查找 DonationReceived 事件
    const event = receipt.events?.find(e => e.event === "DonationReceived");
    if (event) {
      console.log(`\n🎁 DonationReceived 事件:`);
      console.log(`  Contributor: ${event.args.contributor}`);
      console.log(`  Token: ${event.args.token}`);
      console.log(`  Amount: ${hre.ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
      console.log(`  Timestamp: ${event.args.timestamp.toString()}`);
    }

    // 等待链上状态更新
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查最终状态
    const finalDonations = await publicGoodsFund.totalLifetimeDonations();
    const finalContribution = await publicGoodsFund.contributors(deployer.address);

    console.log(`\n最终状态:`);
    console.log(`  totalLifetimeDonations: ${hre.ethers.utils.formatUnits(finalDonations, 6)} USDC`);
    console.log(`  contributors[${deployer.address}]: ${hre.ethers.utils.formatUnits(finalContribution, 6)} USDC`);

    // 计算增量
    const donationsIncrease = finalDonations.sub(initialDonations);
    const contributionIncrease = finalContribution.sub(initialContribution);

    console.log(`\n增量:`);
    console.log(`  totalLifetimeDonations 增加: ${hre.ethers.utils.formatUnits(donationsIncrease, 6)} USDC`);
    console.log(`  contributors 增加: ${hre.ethers.utils.formatUnits(contributionIncrease, 6)} USDC`);

    // 验证
    console.log(`\n📋 验证结果:`);
    if (donationsIncrease.eq(testAmount)) {
      console.log(`  ✅ totalLifetimeDonations 正确增加了 ${hre.ethers.utils.formatUnits(testAmount, 6)} USDC`);
    } else {
      console.log(`  ❌ totalLifetimeDonations 应该增加 ${hre.ethers.utils.formatUnits(testAmount, 6)}, 实际增加 ${hre.ethers.utils.formatUnits(donationsIncrease, 6)}`);
      console.log(`  倍数差异: ${testAmount.toNumber() / donationsIncrease.toNumber()}x`);
    }

    if (contributionIncrease.eq(testAmount)) {
      console.log(`  ✅ contributors 正确增加了 ${hre.ethers.utils.formatUnits(testAmount, 6)} USDC`);
    } else {
      console.log(`  ❌ contributors 应该增加 ${hre.ethers.utils.formatUnits(testAmount, 6)}, 实际增加 ${hre.ethers.utils.formatUnits(contributionIncrease, 6)}`);
      console.log(`  倍数差异: ${testAmount.toNumber() / contributionIncrease.toNumber()}x`);
    }

  } catch (error) {
    console.error("\n❌ 测试失败:", error.message);
    if (error.reason) {
      console.error("原因:", error.reason);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("🎯 分析完成！\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
