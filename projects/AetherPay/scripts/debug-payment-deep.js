const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔍 Deep Debug: Why is Payment Failing?");
  console.log("======================================================================\n");

  const [deployer] = await ethers.getSigners();

  // The actual frontend user from the error
  const FRONTEND_USER = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";

  // Contracts
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";

  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, deployer);
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  console.log("📊 Checking all relevant addresses:");
  console.log("─────────────────────────────────────────────────────────────────────\n");
  console.log("Frontend User:", FRONTEND_USER);
  console.log("Payment Gateway:", PAYMENT_GATEWAY_V2);
  console.log("USDC Token:", MOCK_USDC);

  console.log("\n💰 Frontend User Token Status:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const balance = await usdc.balanceOf(FRONTEND_USER);
  const allowance = await usdc.allowance(FRONTEND_USER, PAYMENT_GATEWAY_V2);

  console.log("USDC Balance:", ethers.utils.formatUnits(balance, 6), "USDC");
  console.log("USDC Allowance to Gateway:", allowance.toString());
  console.log("Is MAX allowance?:", allowance.eq(ethers.constants.MaxUint256));

  // Test the specific order
  const orderIdString = "APB9RMUXL";

  console.log("\n📦 Checking Order Details:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  try {
    const orderDetails = await gateway.getOrderDetailsByString(orderIdString);
    console.log("Order ID:", orderIdString);
    console.log("Bytes32 ID:", orderDetails[0]);
    console.log("Merchant:", orderDetails[1]);
    console.log("Payer:", orderDetails[2] === ethers.constants.AddressZero ? "Anyone" : orderDetails[2]);
    console.log("Order Amount:", ethers.utils.formatUnits(orderDetails[3], 6), "USDC");
    console.log("Payment Token:", orderDetails[4]);
    console.log("Settlement Token:", orderDetails[5]);
    console.log("Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderDetails[8]]);

    // Verify payment token matches
    const tokenMismatch = orderDetails[4].toLowerCase() !== MOCK_USDC.toLowerCase();
    if (tokenMismatch) {
      console.log("\n❌ TOKEN MISMATCH DETECTED!");
      console.log("   Expected:", MOCK_USDC);
      console.log("   Got:", orderDetails[4]);
    } else {
      console.log("\n✅ Payment token matches USDC");
    }

    // Check if order has specific payer requirement
    if (orderDetails[2] !== ethers.constants.AddressZero) {
      const isCorrectPayer = orderDetails[2].toLowerCase() === FRONTEND_USER.toLowerCase();
      console.log("\n🔒 Order has designated payer:", orderDetails[2]);
      console.log("   Frontend user match:", isCorrectPayer ? "✅ YES" : "❌ NO");
    }

    console.log("\n🧪 Simulating transferFrom:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Try to simulate what the contract would do
    const testAmount = orderDetails[3]; // Order amount in wei

    console.log("Testing transferFrom:");
    console.log("  From:", FRONTEND_USER);
    console.log("  To:", PAYMENT_GATEWAY_V2);
    console.log("  Amount:", ethers.utils.formatUnits(testAmount, 6), "USDC");

    // Check if the gateway contract can call transferFrom
    // This would be called by the gateway, not us, but we can check the allowance
    console.log("\n📝 Double-checking allowance for exact amount:");
    console.log("  Required:", testAmount.toString());
    console.log("  Allowance:", allowance.toString());
    console.log("  Sufficient:", allowance.gte(testAmount) ? "✅ YES" : "❌ NO");

    console.log("\n🔍 Testing direct transferFrom (simulating gateway):");

    // Create a new provider to check
    const provider = deployer.provider;

    // Encode the transferFrom call
    const transferFromData = usdc.interface.encodeFunctionData('transferFrom', [
      FRONTEND_USER,
      PAYMENT_GATEWAY_V2,
      testAmount
    ]);

    // Try to estimate gas for the call AS IF the gateway was calling it
    try {
      const gasEstimate = await provider.estimateGas({
        from: PAYMENT_GATEWAY_V2,  // Simulate as if gateway is calling
        to: MOCK_USDC,
        data: transferFromData
      });
      console.log("✅ transferFrom would succeed! Gas estimate:", gasEstimate.toString());
    } catch (error) {
      console.log("❌ transferFrom simulation failed!");
      console.log("   Error:", error.reason || error.message);

      // Try to decode the error
      if (error.data) {
        try {
          const decodedError = usdc.interface.parseError(error.data);
          console.log("   Decoded error:", decodedError);
        } catch {
          console.log("   Raw error data:", error.data);
        }
      }
    }

    console.log("\n🔧 Checking Gateway Contract State:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    const isPaused = await gateway.paused();
    console.log("Gateway paused:", isPaused ? "❌ YES (payments disabled)" : "✅ NO");

    const isTokenSupported = await gateway.supportedTokens(MOCK_USDC);
    console.log("USDC supported:", isTokenSupported ? "✅ YES" : "❌ NO");

  } catch (error) {
    console.log("❌ Error checking order:", error.message);
  }

  console.log("\n💡 Diagnosis:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  if (allowance.eq(ethers.constants.MaxUint256)) {
    console.log("✅ Allowance is correctly set to MAX");
    console.log("\n⚠️  The 'insufficient allowance' error might be misleading!");
    console.log("\nPossible real causes:");
    console.log("  1. The order payment token is not the USDC we approved");
    console.log("  2. The contract is trying to transfer from wrong address");
    console.log("  3. The frontend is sending wrong parameters");
    console.log("  4. There's a reentrancy guard or other check failing");
    console.log("  5. The order status is not PENDING");
    console.log("\n🔍 Check the browser console for the exact transaction parameters");
    console.log("   Look for 'processPayment' call and verify:");
    console.log("   - orderIdBytes32 matches");
    console.log("   - paymentAmount is correct");
    console.log("   - msg.sender is", FRONTEND_USER);
  } else {
    console.log("❌ Allowance is NOT set correctly!");
    console.log("   Current:", allowance.toString());
    console.log("   Need: MAX or at least the order amount");
  }

  console.log("\n======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });