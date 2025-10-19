// 完成部署并更新前端配置
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("📝 更新部署配置和前端...\n");

  // 新部署的合约地址
  const NEW_CONTRACTS = {
    PaymentGatewayV2: "0xAb30d4810D7240D56Ac5d1c18FC1524b5140C5e4",
    PublicGoodsFund: "0x1f0a6886983D8C3B8A862433AD093F410DA31E52",
    MockUSDC: "0xb7225051e57db0296C1F56fbD536Acd06c889724",
    MockUSDT: "0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2",
    FXRouter: "0x81C8F2AdD03187A17F8998541e27E2dD7566c504"
  };

  // 步骤 1: 更新部署配置文件
  console.log("💾 步骤 1: 更新部署配置...");

  const deploymentPath = path.join(__dirname, "../deployment-gateway-v2-public-goods.json");
  const deployment = {
    network: "optimism-sepolia",
    chainId: 11155420,
    timestamp: new Date().toISOString(),
    deployer: "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c",
    contracts: {
      PaymentGatewayV2: NEW_CONTRACTS.PaymentGatewayV2,
      PublicGoodsFund: NEW_CONTRACTS.PublicGoodsFund,
      FXRouter: NEW_CONTRACTS.FXRouter,
      MockUSDC: NEW_CONTRACTS.MockUSDC,
      MockUSDT: NEW_CONTRACTS.MockUSDT,
      DonationAddress: "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c",
      TreasuryAddress: "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c"
    },
    features: {
      spreadDonationEnabled: true,
      publicGoodsFundIntegrated: true,
      platformFeeRate: "30", // 0.3%
      donationPercentage: "500", // 5% of platform fees
    },
    testOrder: {
      orderId: "TEST_1760271688257",
      orderBytes32: "0x046521d00299349ad56bebaef40f8c56dccb1606b79a70db8b40732e8854b62d",
      status: "Created for testing"
    }
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("  ✅ 部署配置已更新");

  // 步骤 2: 更新前端 contracts.ts
  console.log("\n📝 步骤 2: 更新前端配置...");

  const frontendConfigPath = path.join(__dirname, "../frontend/lib/contracts.ts");

  const contractsContent = `// Contract addresses for Optimism Sepolia testnet
// Updated: ${new Date().toISOString()}

export const CONTRACTS = {
  // Core Contracts - 新部署的合约
  PAYMENT_GATEWAY_V2: '${NEW_CONTRACTS.PaymentGatewayV2}',
  PUBLIC_GOODS_FUND: '${NEW_CONTRACTS.PublicGoodsFund}',
  FX_ROUTER: '${NEW_CONTRACTS.FXRouter}',

  // Mock Tokens - 新部署的测试代币
  MOCK_USDC: '${NEW_CONTRACTS.MockUSDC}',
  MOCK_USDT: '${NEW_CONTRACTS.MockUSDT}',

  // Legacy addresses (for compatibility)
  PAYMENT_GATEWAY: '0x7aC993ee1E0b00C319b90822C701dF61896141BA', // 旧版本
} as const;

// Export ABIs
export const PAYMENT_GATEWAY_ABI = [
  // ... existing ABI content
];

export const ERC20_ABI = [
  // ... existing ABI content
];

// 注意：完整的 ABI 内容保持不变，只更新了地址
`;

  // 读取现有文件以保留 ABI 定义
  const existingContent = fs.readFileSync(frontendConfigPath, 'utf8');

  // 提取 ABI 部分（从 "export const PAYMENT_GATEWAY_ABI" 开始）
  const abiStartIndex = existingContent.indexOf('export const PAYMENT_GATEWAY_ABI');
  const abiContent = existingContent.substring(abiStartIndex);

  // 组合新的地址和现有的 ABI
  const updatedContent = `// Contract addresses for Optimism Sepolia testnet
// Updated: ${new Date().toISOString()}

export const CONTRACTS = {
  // Core Contracts - 新部署的合约
  PAYMENT_GATEWAY_V2: '${NEW_CONTRACTS.PaymentGatewayV2}',
  PUBLIC_GOODS_FUND: '${NEW_CONTRACTS.PublicGoodsFund}',
  FX_ROUTER: '${NEW_CONTRACTS.FXRouter}',

  // Mock Tokens - 新部署的测试代币
  MOCK_USDC: '${NEW_CONTRACTS.MockUSDC}',
  MOCK_USDT: '${NEW_CONTRACTS.MockUSDT}',

  // Legacy addresses (for compatibility)
  PAYMENT_GATEWAY: '0x7aC993ee1E0b00C319b90822C701dF61896141BA', // 旧版本
} as const;

// ${abiContent}`;

  fs.writeFileSync(frontendConfigPath, updatedContent);
  console.log("  ✅ 前端配置已更新");

  // 步骤 3: 测试新合约
  console.log("\n🧪 步骤 3: 验证新合约...");

  const [deployer] = await ethers.getSigners();

  // 连接新合约
  const paymentGateway = await ethers.getContractAt(
    "PaymentGatewayV2",
    NEW_CONTRACTS.PaymentGatewayV2
  );

  const publicGoodsFund = await ethers.getContractAt(
    "contracts/PublicGoodsFund.sol:PublicGoodsFund",
    NEW_CONTRACTS.PublicGoodsFund
  );

  // 检查配置
  const publicGoodsFundAddress = await paymentGateway.publicGoodsFund();
  console.log("  PaymentGateway 连接的 PublicGoodsFund:", publicGoodsFundAddress);

  const totalDonations = await publicGoodsFund.totalLifetimeDonations();
  const totalContributors = await publicGoodsFund.getTotalContributors();

  console.log("  PublicGoodsFund 状态:");
  console.log("    总捐款额:", ethers.utils.formatUnits(totalDonations, 6), "USDC");
  console.log("    贡献者数量:", totalContributors.toString());

  // 步骤 4: 创建同币种测试订单（避免跨币种交换失败）
  console.log("\n📦 步骤 4: 创建同币种测试订单...");

  try {
    const orderId = "SAME_CURRENCY_" + Date.now();
    const orderAmount = ethers.utils.parseUnits("10", 6); // 10 USDC

    const createTx = await paymentGateway.createOrder(
      orderId,
      orderAmount,
      NEW_CONTRACTS.MockUSDC,
      NEW_CONTRACTS.MockUSDC, // 同币种：USDC → USDC
      "ipfs://test",
      false,
      ethers.constants.AddressZero
    );
    await createTx.wait();
    console.log("  ✅ 订单创建成功:", orderId);

    // 获取订单 bytes32
    const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);

    // 授权并支付
    const mockUSDC = await ethers.getContractAt("MockERC20", NEW_CONTRACTS.MockUSDC);
    await mockUSDC.approve(NEW_CONTRACTS.PaymentGatewayV2, orderAmount);

    const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount);
    const receipt = await payTx.wait();
    console.log("  ✅ 支付成功!");

    // 检查事件
    const events = receipt.events || [];
    for (const event of events) {
      if (event.event === "DonationProcessed") {
        console.log("  🎁 捐款已处理:");
        console.log("    接收方:", event.args.recipient);
        console.log("    金额:", ethers.utils.formatUnits(event.args.amount, 6), "USDC");
      }
    }

    // 再次检查 PublicGoodsFund
    const newTotalDonations = await publicGoodsFund.totalLifetimeDonations();
    const newTotalContributors = await publicGoodsFund.getTotalContributors();

    console.log("\n  📊 更新后的 PublicGoodsFund:");
    console.log("    总捐款额:", ethers.utils.formatUnits(newTotalDonations, 6), "USDC");
    console.log("    贡献者数量:", newTotalContributors.toString());

    if (newTotalDonations.gt(totalDonations)) {
      console.log("\n  ✅ 捐款功能正常工作！增加了",
        ethers.utils.formatUnits(newTotalDonations.sub(totalDonations), 6), "USDC");
    } else {
      console.log("\n  ⚠️ 捐款未增加，可能还需要进一步调试");
    }

  } catch (error) {
    console.error("  ❌ 测试失败:", error.message);
  }

  console.log("\n✅ 部署完成！");
  console.log("\n📋 新合约地址汇总:");
  console.log("=====================================");
  console.log("PaymentGatewayV2:", NEW_CONTRACTS.PaymentGatewayV2);
  console.log("PublicGoodsFund:", NEW_CONTRACTS.PublicGoodsFund);
  console.log("Mock USDC:", NEW_CONTRACTS.MockUSDC);
  console.log("Mock USDT:", NEW_CONTRACTS.MockUSDT);
  console.log("=====================================");
  console.log("\n下一步:");
  console.log("1. 重启前端: cd frontend && npm run dev");
  console.log("2. 清除浏览器缓存");
  console.log("3. 创建新订单测试");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });