// 测试修复后的捐款计算
const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 测试修复后的捐赠逻辑...\n");

    // 获取合约实例
    const [deployer, user] = await ethers.getSigners();
    
    // 从部署文件读取合约地址
    const fs = require('fs');
    let addresses;
    try {
        addresses = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));
    } catch (error) {
        console.error("❌ 无法读取 addresses.json 文件");
        return;
    }

    const PaymentGateway = await ethers.getContractFactory("PaymentGatewayV2");
    const PublicGoodsFund = await ethers.getContractFactory("PublicGoodsFundV2");
    const MockERC20 = await ethers.getContractFactory("MockERC20");

    const gateway = PaymentGateway.attach(addresses.PaymentGatewayV2);
    const publicGoodsFund = PublicGoodsFund.attach(addresses.PublicGoodsFundV2);
    const usdc = MockERC20.attach(addresses.USDC);

    console.log("📋 合约地址:");
    console.log(`PaymentGatewayV2: ${gateway.address}`);
    console.log(`PublicGoodsFundV2: ${publicGoodsFund.address}`);
    console.log(`USDC: ${usdc.address}\n`);

    // 1. 检查用户初始余额和贡献
    console.log("1️⃣ 检查初始状态...");
    const initialBalance = await usdc.balanceOf(user.address);
    const initialContribution = await publicGoodsFund.contributors(user.address);
    console.log(`用户 USDC 余额: ${ethers.utils.formatUnits(initialBalance, 6)} USDC`);
    console.log(`用户初始贡献: ${ethers.utils.formatUnits(initialContribution, 6)} USDC\n`);

    // 2. 模拟一笔支付交易
    console.log("2️⃣ 模拟支付交易...");
    const paymentAmount = ethers.utils.parseUnits("200", 6); // $200
    const expectedPlatformFee = paymentAmount.mul(30).div(10000); // 0.3% = $0.6
    const expectedDonation = expectedPlatformFee.mul(500).div(10000); // 5% of fee = $0.03

    console.log(`支付金额: ${ethers.utils.formatUnits(paymentAmount, 6)} USDC`);
    console.log(`预期平台费: ${ethers.utils.formatUnits(expectedPlatformFee, 6)} USDC`);
    console.log(`预期捐赠金额: ${ethers.utils.formatUnits(expectedDonation, 6)} USDC\n`);

    // 3. 给用户铸造代币
    console.log("3️⃣ 准备测试代币...");
    await usdc.mint(user.address, paymentAmount.mul(2));
    await usdc.connect(user).approve(gateway.address, paymentAmount.mul(2));
    console.log("✅ 代币准备完成\n");

    // 4. 创建订单
    console.log("4️⃣ 创建测试订单...");
    const orderId = ethers.utils.formatBytes32String("test-order-" + Date.now());
    
    await gateway.connect(user).createOrder(
        orderId,
        deployer.address, // merchant
        paymentAmount,
        usdc.address, // paymentToken
        usdc.address, // settlementToken (同币种)
        Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
        "Test Order"
    );
    console.log(`✅ 订单创建成功: ${orderId}\n`);

    // 5. 执行支付
    console.log("5️⃣ 执行支付...");
    const tx = await gateway.connect(user).processPayment(orderId);
    const receipt = await tx.wait();
    console.log(`✅ 支付完成，交易哈希: ${tx.hash}\n`);

    // 6. 检查结果
    console.log("6️⃣ 检查支付结果...");
    
    // 检查用户贡献
    const finalContribution = await publicGoodsFund.contributors(user.address);
    const contributionIncrease = finalContribution.sub(initialContribution);
    
    console.log(`用户最终贡献: ${ethers.utils.formatUnits(finalContribution, 6)} USDC`);
    console.log(`贡献增加: ${ethers.utils.formatUnits(contributionIncrease, 6)} USDC`);
    
    // 检查 PublicGoodsFund 余额
    const fundBalance = await usdc.balanceOf(publicGoodsFund.address);
    console.log(`PublicGoodsFund USDC 余额: ${ethers.utils.formatUnits(fundBalance, 6)} USDC`);

    // 7. 验证结果
    console.log("\n7️⃣ 验证结果...");
    
    const donationTolerance = ethers.utils.parseUnits("0.001", 6); // 0.001 USDC 容差
    
    if (contributionIncrease.sub(expectedDonation).abs().lte(donationTolerance)) {
        console.log("✅ 捐赠金额正确！");
        console.log(`   预期: ${ethers.utils.formatUnits(expectedDonation, 6)} USDC`);
        console.log(`   实际: ${ethers.utils.formatUnits(contributionIncrease, 6)} USDC`);
    } else {
        console.log("❌ 捐赠金额不正确！");
        console.log(`   预期: ${ethers.utils.formatUnits(expectedDonation, 6)} USDC`);
        console.log(`   实际: ${ethers.utils.formatUnits(contributionIncrease, 6)} USDC`);
        console.log(`   差异: ${ethers.utils.formatUnits(contributionIncrease.sub(expectedDonation).abs(), 6)} USDC`);
    }

    // 8. 测试前端显示逻辑
    console.log("\n8️⃣ 测试前端显示逻辑...");
    
    // 模拟前端调用 getContributorInfo
    const contributorInfo = await publicGoodsFund.getContributorInfo(user.address);
    const totalContributed = contributorInfo[0];
    const level = contributorInfo[1];
    
    // 模拟前端计算 totalDonation
    const totalDonation = parseFloat(ethers.utils.formatUnits(totalContributed, 6));
    
    console.log(`前端显示的总贡献: $${totalDonation.toFixed(2)}`);
    console.log(`用户等级: ${level}`);
    
    // 验证前端显示是否正确
    const expectedFrontendDisplay = parseFloat(ethers.utils.formatUnits(finalContribution, 6));
    
    if (Math.abs(totalDonation - expectedFrontendDisplay) < 0.001) {
        console.log("✅ 前端显示逻辑正确！");
    } else {
        console.log("❌ 前端显示逻辑有问题！");
        console.log(`   预期显示: $${expectedFrontendDisplay.toFixed(2)}`);
        console.log(`   实际显示: $${totalDonation.toFixed(2)}`);
    }

    console.log("\n🎉 测试完成！");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 测试失败:", error);
        process.exit(1);
    });

  // 使用最新部署的合约
  const PAYMENT_GATEWAY_V2 = "0x119122157f5988d65D2D8B1A8b327C2eD27E9417";
  const PUBLIC_GOODS_FUND_V2 = "0xa3CA872b3876FbC2a6759256e57583A25555B4Cb";
  const MOCK_USDC = "0xb7225051e57db0296C1F56fbD536Acd06c889724";

  // 连接合约
  const paymentGateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);
  const publicGoodsFund = await ethers.getContractAt("PublicGoodsFundV2", PUBLIC_GOODS_FUND_V2);
  const mockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC);

  // 获取初始状态
  const initialDonations = await publicGoodsFund.totalLifetimeDonations();
  console.log("初始捐款总额:", ethers.utils.formatUnits(initialDonations, 6), "USDC");

  // 创建测试订单
  const orderAmounts = [
    ethers.utils.parseUnits("100", 6),  // 100 USDC
    ethers.utils.parseUnits("50", 6),   // 50 USDC
    ethers.utils.parseUnits("10", 6)    // 10 USDC
  ];

  let totalExpectedDonation = ethers.BigNumber.from(0);

  for (let i = 0; i < orderAmounts.length; i++) {
    const orderAmount = orderAmounts[i];
    const orderId = `TEST_FIX_${Date.now()}_${i}`;

    console.log(`\n📝 测试订单 ${i + 1}:`);
    console.log("  订单金额:", ethers.utils.formatUnits(orderAmount, 6), "USDC");

    // 计算预期值
    const expectedPlatformFee = orderAmount.mul(30).div(10000); // 0.3%
    const expectedDonation = expectedPlatformFee.mul(500).div(10000); // 5% of platform fee
    totalExpectedDonation = totalExpectedDonation.add(expectedDonation);

    console.log("  预期平台费:", ethers.utils.formatUnits(expectedPlatformFee, 6), "USDC");
    console.log("  预期捐款:", ethers.utils.formatUnits(expectedDonation, 6), "USDC");

    // 创建订单
    const createTx = await paymentGateway.createOrder(
      orderId,
      orderAmount,
      MOCK_USDC,
      MOCK_USDC, // 同币种
      "ipfs://test",
      false,
      ethers.constants.AddressZero
    );
    await createTx.wait();

    // 获取订单 bytes32
    const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);

    // Mint 并授权
    await mockUSDC.mint(deployer.address, orderAmount);
    await mockUSDC.approve(PAYMENT_GATEWAY_V2, orderAmount);

    // 执行支付
    const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount);
    const receipt = await payTx.wait();

    // 检查事件
    let eventDonation = ethers.BigNumber.from(0);
    for (const event of receipt.events || []) {
      if (event.event === "DonationProcessed") {
        eventDonation = event.args.amount;
        console.log("  ✅ 事件捐款金额:", ethers.utils.formatUnits(eventDonation, 6), "USDC");
      }
    }

    // 验证事件金额是否正确
    if (eventDonation.eq(expectedDonation)) {
      console.log("  ✅ 事件金额正确!");
    } else {
      console.log("  ❌ 事件金额不正确!");
      console.log("    预期:", ethers.utils.formatUnits(expectedDonation, 6));
      console.log("    实际:", ethers.utils.formatUnits(eventDonation, 6));
    }
  }

  // 等待链上状态更新
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 检查最终状态
  const finalDonations = await publicGoodsFund.totalLifetimeDonations();
  const actualIncrease = finalDonations.sub(initialDonations);

  console.log("\n" + "=".repeat(50));
  console.log("📊 最终结果:");
  console.log("=".repeat(50));
  console.log("初始捐款总额:", ethers.utils.formatUnits(initialDonations, 6), "USDC");
  console.log("最终捐款总额:", ethers.utils.formatUnits(finalDonations, 6), "USDC");
  console.log("实际增加:", ethers.utils.formatUnits(actualIncrease, 6), "USDC");
  console.log("预期增加:", ethers.utils.formatUnits(totalExpectedDonation, 6), "USDC");

  // 计算比率
  if (totalExpectedDonation.gt(0)) {
    const ratio = actualIncrease.mul(100).div(totalExpectedDonation);
    console.log("实际/预期比率:", ratio.toString() + "%");

    if (ratio.gte(95) && ratio.lte(105)) {
      console.log("\n✅ 捐款金额计算正确!");
    } else if (ratio.lt(10)) {
      console.log("\n❌ 捐款金额仍然存在100倍差异!");
      console.log("建议：需要重新部署合约以应用修复");
    } else {
      console.log("\n⚠️ 捐款金额有偏差");
    }
  }

  // 获取贡献者信息
  const contributorInfo = await publicGoodsFund.getContributorInfo(deployer.address);
  console.log("\n👤 贡献者信息:");
  console.log("  总贡献:", ethers.utils.formatUnits(contributorInfo.totalContributed, 6), "USDC");
  console.log("  等级:", contributorInfo.level);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });