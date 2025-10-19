const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔬 FINAL DEBUG: Testing safeTransferFrom Directly");
  console.log("======================================================================\n");

  // Addresses
  const FRONTEND_USER = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";

  const provider = ethers.provider;

  // Get the USDC contract
  const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, provider);

  console.log("📊 Current State:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Check balance and allowance
  const balance = await usdc.balanceOf(FRONTEND_USER);
  const allowance = await usdc.allowance(FRONTEND_USER, PAYMENT_GATEWAY_V2);

  console.log("User:", FRONTEND_USER);
  console.log("Gateway:", PAYMENT_GATEWAY_V2);
  console.log("Token:", MOCK_USDC);
  console.log("\nBalance:", ethers.utils.formatUnits(balance, 6), "USDC");
  console.log("Raw Balance:", balance.toString());
  console.log("\nAllowance:", ethers.utils.formatUnits(allowance, 6), "USDC");
  console.log("Raw Allowance:", allowance.toString());
  console.log("Is MAX?:", allowance.eq(ethers.constants.MaxUint256));

  // Test amount (23 USDC from the order)
  const testAmount = ethers.utils.parseUnits("23", 6);

  console.log("\n🧪 Test Transfer Amount:", ethers.utils.formatUnits(testAmount, 6), "USDC");
  console.log("Raw Amount:", testAmount.toString());

  console.log("\n✅ Checks:");
  console.log("─────────────────────────────────────────────────────────────────────\n");
  console.log("Has enough balance?:", balance.gte(testAmount) ? "✅ YES" : "❌ NO");
  console.log("Has enough allowance?:", allowance.gte(testAmount) ? "✅ YES" : "❌ NO");

  // Now, let's test calling transferFrom AS IF we were the gateway
  console.log("\n🔍 Testing transferFrom Call (simulating as gateway):");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Encode the transferFrom call
  const transferFromData = usdc.interface.encodeFunctionData('transferFrom', [
    FRONTEND_USER,
    PAYMENT_GATEWAY_V2,
    testAmount
  ]);

  console.log("Call data:", transferFromData);

  try {
    // Estimate gas AS IF the gateway was calling
    const gasEstimate = await provider.estimateGas({
      from: PAYMENT_GATEWAY_V2,
      to: MOCK_USDC,
      data: transferFromData
    });
    console.log("✅ transferFrom would succeed!");
    console.log("   Gas estimate:", gasEstimate.toString());
  } catch (error) {
    console.log("❌ transferFrom would fail!");
    console.log("   Error:", error.reason || error.message);
  }

  // Let's also check what the gateway contract sees
  console.log("\n🔎 Double-checking with static call:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  try {
    // Try a static call (doesn't actually execute)
    const result = await provider.call({
      from: PAYMENT_GATEWAY_V2,
      to: MOCK_USDC,
      data: transferFromData
    });
    console.log("✅ Static call succeeded!");
    console.log("   Return value:", result);
  } catch (error) {
    console.log("❌ Static call failed!");
    console.log("   Error:", error.reason || error.message);

    // Try to decode the error
    if (error.data) {
      console.log("   Error data:", error.data);

      // Common error signatures
      const errorSignatures = {
        '0x08c379a0': 'Error(string)',
        '0x4e487b71': 'Panic(uint256)',
        '0xb12d13eb': 'Custom error'
      };

      const sig = error.data.slice(0, 10);
      console.log("   Error signature:", sig);

      if (sig === '0x08c379a0') {
        // It's a revert with reason string
        try {
          const reason = ethers.utils.defaultAbiCoder.decode(['string'], '0x' + error.data.slice(138));
          console.log("   Decoded reason:", reason[0]);
        } catch {
          console.log("   Could not decode reason");
        }
      }
    }
  }

  // Check the specific order
  console.log("\n📦 Order Check:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  try {
    const orderDetails = await gateway.getOrderDetailsByString("APB9RMUXL");
    console.log("Order found!");
    console.log("  Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderDetails[8]]);
    console.log("  Payment Token:", orderDetails[4]);
    console.log("  Amount:", ethers.utils.formatUnits(orderDetails[3], 6), "USDC");

    // Check if payment token matches
    if (orderDetails[4].toLowerCase() !== MOCK_USDC.toLowerCase()) {
      console.log("\n⚠️  WARNING: Order uses different token!");
      console.log("  Expected:", MOCK_USDC);
      console.log("  Got:", orderDetails[4]);
    }
  } catch (error) {
    console.log("Order not found or error:", error.message);
  }

  console.log("\n💭 Final Analysis:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  if (allowance.eq(ethers.constants.MaxUint256) && balance.gte(testAmount)) {
    console.log("✅ Everything looks correct on-chain!");
    console.log("\n🐛 The issue must be in the frontend transaction encoding.");
    console.log("\nPossible causes:");
    console.log("  1. Wrong token address being used in the transaction");
    console.log("  2. Wrong 'from' address in the transferFrom call");
    console.log("  3. Frontend is encoding the transaction incorrectly");
    console.log("  4. There's a middleware/proxy intercepting the call");
    console.log("\n💡 Try this in the browser console:");
    console.log("  1. Open the payment page");
    console.log("  2. Open DevTools Console");
    console.log("  3. Check if window.ethereum.selectedAddress === '" + FRONTEND_USER + "'");
  }

  console.log("\n======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });