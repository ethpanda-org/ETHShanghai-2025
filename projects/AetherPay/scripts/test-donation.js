// 测试现有合约的捐款功能
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 测试现有合约的 PublicGoodsFund 功能...\n");

  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address);

  // 读取部署配置
  const deploymentPath = path.join(__dirname, "../deployment-gateway-v2-public-goods.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const PAYMENT_GATEWAY = deployment.contracts.PaymentGatewayV2;
  const PUBLIC_GOODS_FUND = deployment.contracts.PublicGoodsFund;
  const MOCK_USDC = deployment.contracts.SupportedTokens.USDC;
  const MOCK_USDT = deployment.contracts.SupportedTokens.USDT;

  console.log("📋 合约地址:");
  console.log("  PaymentGatewayV2:", PAYMENT_GATEWAY);
  console.log("  PublicGoodsFund:", PUBLIC_GOODS_FUND);
  console.log("  USDC:", MOCK_USDC);
  console.log("  USDT:", MOCK_USDT);

  // 连接合约
  const paymentGateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY);
  const publicGoodsFund = await ethers.getContractAt("contracts/PublicGoodsFund.sol:PublicGoodsFund", PUBLIC_GOODS_FUND);

  // 步骤 1: 检查 PaymentGatewayV2 的配置
  console.log("\n📊 步骤 1: 检查 PaymentGatewayV2 配置...");

  const publicGoodsFundAddress = await paymentGateway.publicGoodsFund();
  const donationAddress = await paymentGateway.donationAddress();
  const enableSpreadDonation = await paymentGateway.enableSpreadDonation();
  const platformFeeRate = await paymentGateway.platformFeeRate();
  const donationPercentage = await paymentGateway.donationPercentage();

  console.log("  PublicGoodsFund 地址:", publicGoodsFundAddress);
  console.log("  Donation 地址:", donationAddress);
  console.log("  价差捐赠开启:", enableSpreadDonation);
  console.log("  平台费率:", platformFeeRate.toString(), "/ 10000 (", platformFeeRate * 100 / 10000, "%)");
  console.log("  捐赠比例:", donationPercentage.toString(), "/ 10000 (", donationPercentage * 100 / 10000, "%)");

  // 步骤 2: 检查 PublicGoodsFund 状态
  console.log("\n📊 步骤 2: 检查 PublicGoodsFund 状态...");

  const totalLifetimeDonations = await publicGoodsFund.totalLifetimeDonations();
  const totalContributors = await publicGoodsFund.getTotalContributors();

  console.log("  总捐款额:", ethers.utils.formatUnits(totalLifetimeDonations, 6), "USDC");
  console.log("  贡献者数量:", totalContributors.toString());

  // 步骤 3: 注册商家（如果还没注册）
  console.log("\n📊 步骤 3: 确保商家已注册...");

  try {
    const merchantInfo = await paymentGateway.getMerchantInfo(deployer.address);
    if (!merchantInfo.isActive) {
      await paymentGateway.registerMerchant("Test Merchant");
      console.log("  ✅ 商家已注册");
    } else {
      console.log("  ℹ️ 商家已注册");
    }
  } catch (e) {
    await paymentGateway.registerMerchant("Test Merchant");
    console.log("  ✅ 商家已注册");
  }

  // 步骤 4: 获取测试代币
  console.log("\n📊 步骤 4: 获取测试代币...");

  // 使用 MockERC20 合约 mint 代币
  const MockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC);

  // 检查余额
  const balance = await MockUSDC.balanceOf(deployer.address);
  console.log("  当前 USDC 余额:", ethers.utils.formatUnits(balance, 6));

  if (balance.lt(ethers.utils.parseUnits("1000", 6))) {
    // 尝试使用 faucet
    try {
      const mintTx = await MockUSDC.faucet(ethers.utils.parseUnits("10000", 6));
      await mintTx.wait();
      console.log("  ✅ 已获取 10000 USDC");
    } catch (e) {
      console.log("  ❌ 无法获取代币:", e.message);
      // 尝试 mint（需要是 owner）
      try {
        const mintTx = await MockUSDC.mint(deployer.address, ethers.utils.parseUnits("10000", 6));
        await mintTx.wait();
        console.log("  ✅ 已铸造 10000 USDC");
      } catch (e2) {
        console.log("  ❌ 无法铸造代币（不是 owner）");
      }
    }
  }

  // 步骤 5: 创建测试订单
  console.log("\n📊 步骤 5: 创建测试订单...");

  const orderId = "TEST_DONATION_" + Date.now();
  const orderAmount = ethers.utils.parseUnits("100", 6); // 100 USDC

  console.log("  订单 ID:", orderId);
  console.log("  订单金额: 100 USDC");

  const createTx = await paymentGateway.createOrder(
    orderId,
    orderAmount,
    MOCK_USDC,
    MOCK_USDT, // USDC -> USDT 同稳定币交易
    "ipfs://TestDonation",
    false,
    ethers.constants.AddressZero,
    { gasLimit: 500000 }
  );
  await createTx.wait();
  console.log("  ✅ 订单已创建");

  // 获取 bytes32 订单 ID
  const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);
  console.log("  订单 bytes32:", orderBytes32);

  // 步骤 6: 授权并支付
  console.log("\n📊 步骤 6: 授权并支付订单...");

  // 授权
  const approveTx = await MockUSDC.approve(PAYMENT_GATEWAY, orderAmount);
  await approveTx.wait();
  console.log("  ✅ USDC 授权完成");

  // 支付
  const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount, { gasLimit: 1000000 });
  const payReceipt = await payTx.wait();
  console.log("  ✅ 支付完成, Gas used:", payReceipt.gasUsed.toString());

  // 步骤 7: 检查事件
  console.log("\n📊 步骤 7: 分析交易事件...");

  const events = payReceipt.events || [];
  for (const event of events) {
    if (event.event === "DonationProcessed") {
      console.log("  🎁 DonationProcessed 事件:");
      console.log("    接收方:", event.args.recipient);
      console.log("    金额:", ethers.utils.formatUnits(event.args.amount, 6), "USDC");
    }
    if (event.event === "OrderCompleted") {
      console.log("  ✅ OrderCompleted 事件:");
      console.log("    商家:", event.args.merchant);
      console.log("    收到金额:", ethers.utils.formatUnits(event.args.receivedAmount, 6));
      console.log("    平台费:", ethers.utils.formatUnits(event.args.platformFee, 6));
    }
  }

  // 步骤 8: 再次检查 PublicGoodsFund 状态
  console.log("\n📊 步骤 8: 支付后检查 PublicGoodsFund 状态...");

  const newTotalDonations = await publicGoodsFund.totalLifetimeDonations();
  const newContributors = await publicGoodsFund.getTotalContributors();

  console.log("  总捐款额:", ethers.utils.formatUnits(newTotalDonations, 6), "USDC");
  console.log("  贡献者数量:", newContributors.toString());

  const donationIncrease = newTotalDonations.sub(totalLifetimeDonations);
  if (donationIncrease.gt(0)) {
    console.log("  ✅ 本次捐款增加:", ethers.utils.formatUnits(donationIncrease, 6), "USDC");
  } else {
    console.log("  ❌ 捐款没有增加！");
  }

  // 步骤 9: 分析问题
  console.log("\n🔍 问题分析:");

  if (donationIncrease.eq(0)) {
    console.log("\n❌ 捐款没有被记录到 PublicGoodsFund!");
    console.log("\n可能的原因:");
    console.log("1. _processDonation() 函数将捐款发送到了 donationAddress 而不是 PublicGoodsFund");
    console.log("2. PublicGoodsFund 合约缺少 contributeFee() 函数");
    console.log("3. PaymentGatewayV2 没有正确调用 PublicGoodsFund");

    console.log("\n解决方案:");
    console.log("1. 需要重新部署带有修复的 PaymentGatewayV2 合约");
    console.log("2. 或者部署新的 PublicGoodsFund 合约（包含 contributeFee 函数）");
    console.log("3. 然后更新 PaymentGatewayV2 的 PublicGoodsFund 地址");

    // 检查 donationAddress 的余额变化
    const donationAddressBalance = await MockUSDC.balanceOf(donationAddress);
    console.log("\n📊 DonationAddress 余额:", ethers.utils.formatUnits(donationAddressBalance, 6), "USDC");
    console.log("   (如果这个余额在增加，说明捐款去了这里而不是 PublicGoodsFund)");
  } else {
    console.log("\n✅ 捐款功能正常工作!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });