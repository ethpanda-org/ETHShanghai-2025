// 在浏览器控制台运行这段代码来直接测试支付

// 配置
const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
const ORDER_ID = "TEST_PUBLIC_1760230985025"; // 替换为你的订单ID

// ABI
const GATEWAY_ABI = [
  "function processPayment(bytes32 orderId, uint256 paymentAmount) returns (bool)",
  "function getOrderDetailsByString(string orderIdString) view returns (bytes32, address, address, uint256, address, address, uint256, uint256, uint8, uint256, uint256, string)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

async function testPayment() {
  try {
    console.log("🚀 Starting direct payment test...");

    // 1. 连接 MetaMask
    if (!window.ethereum) {
      throw new Error("Please install MetaMask!");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();

    console.log("✅ Connected:", userAddress);

    // 2. 获取合约实例
    const gateway = new ethers.Contract(PAYMENT_GATEWAY_V2, GATEWAY_ABI, signer);
    const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, signer);

    // 3. 检查余额和授权
    const balance = await usdc.balanceOf(userAddress);
    const allowance = await usdc.allowance(userAddress, PAYMENT_GATEWAY_V2);

    console.log("💰 Balance:", ethers.utils.formatUnits(balance, 6), "USDC");
    console.log("🔓 Allowance:", allowance.toString());
    console.log("   Is MAX?", allowance.eq(ethers.constants.MaxUint256));

    // 4. 获取订单详情
    console.log("📦 Fetching order:", ORDER_ID);
    const orderDetails = await gateway.getOrderDetailsByString(ORDER_ID);
    const orderIdBytes32 = orderDetails[0];
    const orderAmount = orderDetails[3];
    const orderStatus = orderDetails[8];

    console.log("   Order ID (bytes32):", orderIdBytes32);
    console.log("   Amount:", ethers.utils.formatUnits(orderAmount, 6), "USDC");
    console.log("   Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderStatus]);

    if (orderStatus !== 0) {
      throw new Error("Order is not pending!");
    }

    // 5. 如果需要，重新授权
    if (allowance.lt(orderAmount)) {
      console.log("⚠️ Need to approve first...");
      const approveTx = await usdc.approve(PAYMENT_GATEWAY_V2, ethers.constants.MaxUint256);
      console.log("   Approve TX:", approveTx.hash);
      await approveTx.wait();
      console.log("✅ Approval confirmed!");
    }

    // 6. 执行支付
    console.log("💳 Processing payment...");
    const paymentTx = await gateway.processPayment(orderIdBytes32, orderAmount, {
      gasLimit: 300000 // 手动设置 gas limit
    });
    console.log("✅ Payment TX:", paymentTx.hash);

    // 7. 等待确认
    const receipt = await paymentTx.wait();
    console.log("🎉 Payment successful!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());

    return "SUCCESS!";

  } catch (error) {
    console.error("❌ Error:", error);

    // 详细错误信息
    if (error.data) {
      console.log("Error data:", error.data);
    }
    if (error.reason) {
      console.log("Error reason:", error.reason);
    }
    if (error.message) {
      console.log("Error message:", error.message);
    }

    throw error;
  }
}

// 运行测试
console.log("📝 Copy and paste this entire code into your browser console");
console.log("📝 Then run: testPayment()");

// 自动运行（可选）
testPayment().then(console.log).catch(console.error);