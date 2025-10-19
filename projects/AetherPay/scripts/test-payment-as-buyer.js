const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * 🧪 测试脚本：模拟买家支付商家创建的订单
 * 
 * 使用场景：
 * 1. 商家用钱包 A 创建了订单
 * 2. 买家用钱包 B 来支付订单
 * 
 * 运行方式：
 * npx hardhat run scripts/test-payment-as-buyer.js --network op-sepolia
 */

async function main() {
  console.log("\n======================================================================");
  console.log("🧪 Testing Payment Flow: Buyer Pays Merchant's Order");
  console.log("======================================================================\n");

  // 获取账户
  const signers = await ethers.getSigners();
  const merchant = signers[0];

  // 使用同一个账户作为商家和买家（测试环境）
  const buyer = merchant;

  console.log("👤 Merchant Address:", merchant.address);
  console.log("👤 Buyer Address:", buyer.address);
  console.log("📝 Note: Using same account for merchant and buyer in test");
  console.log("");

  // 合约地址
  const PAYMENT_GATEWAY_V2 = "0x65E71cA6C9bD72eceAd2de0Ed06BF135BBfc31b3";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  // 获取合约实例
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  // 使用 ERC20 接口的最小 ABI
  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount) returns (bool)"
  ];
  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, merchant);

  // ============ Step 1: 检查商家是否已注册 ============
  console.log("📋 Step 1: Checking Merchant Registration");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const merchantInfo = await gateway.getMerchantInfo(merchant.address);
  const isRegistered = merchantInfo[5]; // isActive

  if (!isRegistered) {
    console.log("⚠️  Merchant not registered. Registering now...");
    const tx = await gateway.connect(merchant).registerMerchant("Test Merchant");
    await tx.wait();
    console.log("✅ Merchant registered!\n");
  } else {
    console.log("✅ Merchant already registered:", merchantInfo[0], "\n");
  }

  // ============ Step 2: 商家创建订单 ============
  console.log("📋 Step 2: Merchant Creates Order");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const orderIdString = "TEST_" + Date.now();
  const orderAmount = ethers.parseUnits("10", 6); // 10 USDC

  console.log("Creating order:", orderIdString);
  console.log("Order amount:", ethers.formatUnits(orderAmount, 6), "USDC");

  const createTx = await gateway.connect(merchant).createOrder(
    orderIdString,
    orderAmount,
    MOCK_USDC,
    MOCK_USDT,
    "ipfs://test-metadata",
    false, // allowPartialPayment
    ethers.ZeroAddress // designatedPayer - 设置为 address(0) 表示公开订单，任何人都可以支付
  );
  await createTx.wait();
  console.log("✅ Order created by merchant!\n");

  // 获取订单详情
  const orderDetails = await gateway.getOrderDetailsByString(orderIdString);
  const orderIdBytes32 = orderDetails[0];
  
  console.log("📦 Order Details:");
  console.log("  Order ID (string):", orderIdString);
  console.log("  Order ID (bytes32):", orderIdBytes32);
  console.log("  Merchant:", orderDetails[1]);
  console.log("  Amount:", ethers.formatUnits(orderDetails[3], 6), "USDC");
  console.log("  Payment Token:", orderDetails[4]);
  console.log("  Settlement Token:", orderDetails[5]);
  console.log("  Status:", orderDetails[8], "(0=Pending)");
  console.log("");

  // ============ Step 3: 给买家铸造测试代币 ============
  console.log("📋 Step 3: Minting Test Tokens for Buyer");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const buyerBalance = await usdc.balanceOf(buyer.address);
  console.log("Buyer current balance:", ethers.formatUnits(buyerBalance, 6), "USDC");

  if (buyerBalance < orderAmount) {
    console.log("⚠️  Insufficient balance. Minting tokens...");
    const mintAmount = ethers.parseUnits("1000", 6); // 铸造 1000 USDC
    const mintTx = await usdc.mint(buyer.address, mintAmount);
    await mintTx.wait();
    console.log("✅ Minted", ethers.formatUnits(mintAmount, 6), "USDC to buyer");
    
    const newBalance = await usdc.balanceOf(buyer.address);
    console.log("New balance:", ethers.formatUnits(newBalance, 6), "USDC\n");
  } else {
    console.log("✅ Buyer has sufficient balance\n");
  }

  // ============ Step 4: 买家授权代币 ============
  console.log("📋 Step 4: Buyer Approves Token");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const currentAllowance = await usdc.allowance(buyer.address, PAYMENT_GATEWAY_V2);
  console.log("Current allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");

  if (currentAllowance < orderAmount) {
    console.log("⚠️  Insufficient allowance. Approving...");
    
    // 如果已有非零授权，先置为 0（兼容 USDT 类代币）
    if (currentAllowance > 0n) {
      console.log("  Resetting allowance to 0...");
      const resetTx = await usdc.connect(buyer).approve(PAYMENT_GATEWAY_V2, 0);
      await resetTx.wait();
    }
    
    // 授权无限额度
    const maxApproval = ethers.MaxUint256;
    console.log("  Approving unlimited amount...");
    const approveTx = await usdc.connect(buyer).approve(PAYMENT_GATEWAY_V2, maxApproval);
    await approveTx.wait();
    
    const newAllowance = await usdc.allowance(buyer.address, PAYMENT_GATEWAY_V2);
    console.log("✅ Approved! New allowance:", ethers.formatUnits(newAllowance, 6), "USDC\n");
  } else {
    console.log("✅ Buyer already has sufficient allowance\n");
  }

  // ============ Step 5: 买家支付订单 ============
  console.log("📋 Step 5: Buyer Pays Order");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  console.log("Processing payment...");
  console.log("  Payer:", buyer.address);
  console.log("  Amount:", ethers.formatUnits(orderAmount, 6), "USDC");

  try {
    const payTx = await gateway.connect(buyer).processPayment(
      orderIdBytes32,
      orderAmount
    );
    const receipt = await payTx.wait();
    
    console.log("✅ Payment successful!");
    console.log("  Transaction hash:", receipt.hash);
    console.log("");

    // 获取更新后的订单详情
    const updatedOrder = await gateway.getOrderDetailsByString(orderIdString);
    console.log("📦 Updated Order Details:");
    console.log("  Paid Amount:", ethers.formatUnits(updatedOrder[6], 6), "USDC");
    console.log("  Received Amount:", ethers.formatUnits(updatedOrder[7], 6), "USDT");
    console.log("  Status:", updatedOrder[8], "(1=Paid, 2=Completed)");
    console.log("  Payer:", updatedOrder[2]);
    console.log("");

    // 检查商家余额
    const merchantBalance = await gateway.getMerchantInfo(merchant.address);
    console.log("💰 Merchant Pending Balance:", ethers.formatUnits(merchantBalance[3], 6), "USDT");

  } catch (error) {
    console.error("❌ Payment failed!");
    console.error("Error:", error.message);
    
    if (error.message.includes("insufficient allowance")) {
      console.log("\n💡 Troubleshooting:");
      console.log("  1. Check buyer's allowance:", await usdc.allowance(buyer.address, PAYMENT_GATEWAY_V2));
      console.log("  2. Check buyer's balance:", await usdc.balanceOf(buyer.address));
      console.log("  3. Check order amount:", orderAmount.toString());
    }
  }

  console.log("\n======================================================================");
  console.log("✅ Test Complete!");
  console.log("======================================================================\n");

  console.log("📝 Summary:");
  console.log("  Merchant:", merchant.address);
  console.log("  Buyer:", buyer.address);
  console.log("  Order ID:", orderIdString);
  console.log("  Payment Link:", `http://localhost:3000/pay/${orderIdString}`);
  console.log("");
  console.log("💡 Next Steps:");
  console.log("  1. Visit the payment link in your browser");
  console.log("  2. Connect with the BUYER wallet (not merchant!)");
  console.log("  3. Complete the payment");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

