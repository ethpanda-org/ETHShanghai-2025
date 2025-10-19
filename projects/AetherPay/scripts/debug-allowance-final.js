const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔍 Debugging ERC20 Allowance Issue - Final Analysis");
  console.log("======================================================================\n");

  const [signer] = await ethers.getSigners();
  console.log("📝 Using account:", signer.address);

  // Contract addresses from frontend (deployment-gateway-v2.json)
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";

  // Get contracts - use ERC20 standard interface
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  // Use IERC20 interface for the token
  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, signer);

  console.log("\n📊 Contract Information:");
  console.log("─────────────────────────────────────────────────────────────────────\n");
  console.log("Payment Gateway V2:", PAYMENT_GATEWAY_V2);
  console.log("Mock USDC:", MOCK_USDC);
  console.log("User Address:", signer.address);

  console.log("\n💰 Token Information:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  try {
    // Get token info
    const tokenName = await usdc.name();
    const tokenSymbol = await usdc.symbol();
    const tokenDecimals = await usdc.decimals();
    const totalSupply = await usdc.totalSupply();

    console.log("Token Name:", tokenName);
    console.log("Token Symbol:", tokenSymbol);
    console.log("Token Decimals:", tokenDecimals);
    console.log("Total Supply:", ethers.utils.formatUnits(totalSupply, tokenDecimals));

    // Get user balance
    const balance = await usdc.balanceOf(signer.address);
    console.log("\n✅ Your Balance:", ethers.utils.formatUnits(balance, tokenDecimals), tokenSymbol);
    console.log("   Raw Balance:", balance.toString());

    // Get current allowance
    const allowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
    console.log("\n✅ Current Allowance for PaymentGateway:", ethers.utils.formatUnits(allowance, tokenDecimals), tokenSymbol);
    console.log("   Raw Allowance:", allowance.toString());

    // Check if it's max allowance
    const MAX_UINT256 = ethers.constants.MaxUint256;
    if (allowance.eq(MAX_UINT256)) {
      console.log("   ✅ Allowance is set to MAX (unlimited)");
    }

    console.log("\n🔍 Testing Different User Addresses:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Test addresses that might be trying to make payments
    const testAddresses = [
      "0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c", // Deployer/current signer
      "0x5d960b5f98Ea40e94e494FCaB2Cc3f1AfC9218ce", // Frontend user from your error
      "0x0000000000000000000000000000000000000000"  // Zero address check
    ];

    for (const addr of testAddresses) {
      if (addr === "0x0000000000000000000000000000000000000000") continue;

      try {
        const addrBalance = await usdc.balanceOf(addr);
        const addrAllowance = await usdc.allowance(addr, PAYMENT_GATEWAY_V2);

        console.log(`Address: ${addr}`);
        console.log(`  Balance: ${ethers.utils.formatUnits(addrBalance, tokenDecimals)} ${tokenSymbol}`);
        console.log(`  Allowance: ${addrAllowance.eq(MAX_UINT256) ? 'MAX' : ethers.utils.formatUnits(addrAllowance, tokenDecimals)} ${tokenSymbol}`);
        console.log(`  Status: ${addrAllowance.gt(0) ? '✅ Has allowance' : '❌ No allowance'}`);
        console.log("");
      } catch (error) {
        console.log(`Address: ${addr} - Error: ${error.message}`);
      }
    }

    console.log("\n🧪 Testing Order and Payment Flow:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Check a specific order if it exists
    const orderIdString = "APZNPBAGJ"; // The order from your error

    try {
      const orderDetails = await gateway.getOrderDetailsByString(orderIdString);
      console.log("📦 Order Found:", orderIdString);
      console.log("   Order ID (bytes32):", orderDetails[0]);
      console.log("   Merchant:", orderDetails[1]);
      console.log("   Payer:", orderDetails[2] === "0x0000000000000000000000000000000000000000" ? "Any (public order)" : orderDetails[2]);
      console.log("   Order Amount:", ethers.utils.formatUnits(orderDetails[3], 6), "USDC");
      console.log("   Payment Token:", orderDetails[4]);
      console.log("   Settlement Token:", orderDetails[5]);
      console.log("   Paid Amount:", ethers.utils.formatUnits(orderDetails[6], 6));
      console.log("   Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][orderDetails[8]]);

      // Check if the payment token matches our USDC
      if (orderDetails[4].toLowerCase() !== MOCK_USDC.toLowerCase()) {
        console.log("\n⚠️  WARNING: Order payment token doesn't match expected USDC!");
        console.log("   Expected:", MOCK_USDC);
        console.log("   Got:", orderDetails[4]);
      }

      // Check allowance for the designated payer if set
      if (orderDetails[2] !== "0x0000000000000000000000000000000000000000") {
        const payerAllowance = await usdc.allowance(orderDetails[2], PAYMENT_GATEWAY_V2);
        const payerBalance = await usdc.balanceOf(orderDetails[2]);
        console.log("\n💳 Designated Payer Status:");
        console.log("   Address:", orderDetails[2]);
        console.log("   Balance:", ethers.utils.formatUnits(payerBalance, 6), "USDC");
        console.log("   Allowance:", ethers.utils.formatUnits(payerAllowance, 6), "USDC");
        console.log("   Can Pay:", payerBalance.gte(orderDetails[3]) && payerAllowance.gte(orderDetails[3]) ? "✅ Yes" : "❌ No");
      }

    } catch (error) {
      console.log("❌ Order not found or error:", error.message);
    }

    console.log("\n🔗 Testing Direct Contract Interaction:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Test if gateway is paused
    const isPaused = await gateway.paused();
    console.log("Gateway Paused:", isPaused ? "❌ Yes (payments disabled)" : "✅ No");

    // Check if USDC is supported token
    const isSupported = await gateway.supportedTokens(MOCK_USDC);
    console.log("USDC Supported:", isSupported ? "✅ Yes" : "❌ No");

    console.log("\n💡 Diagnosis & Recommendations:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Analyze the situation
    if (balance.eq(0)) {
      console.log("❌ ISSUE: You have no USDC balance.");
      console.log("   SOLUTION: Get test tokens first:");
      console.log("   npx hardhat run scripts/mint-tokens.js --network op-sepolia");
    }

    if (allowance.eq(0)) {
      console.log("❌ ISSUE: You have no allowance set.");
      console.log("   SOLUTION: Approve tokens in the frontend or run:");
      console.log(`   await usdc.approve("${PAYMENT_GATEWAY_V2}", ethers.utils.parseUnits("1000", 6))`);
    }

    if (allowance.gt(0) && allowance.lt(MAX_UINT256)) {
      console.log("⚠️  ISSUE: Limited allowance set.");
      console.log("   Current:", ethers.utils.formatUnits(allowance, 6), "USDC");
      console.log("   SOLUTION: Consider setting unlimited allowance:");
      console.log(`   await usdc.approve("${PAYMENT_GATEWAY_V2}", ethers.constants.MaxUint256)`);
    }

    if (allowance.eq(MAX_UINT256) && balance.gt(0)) {
      console.log("✅ Your setup looks good (balance + max allowance)!");
      console.log("\n🔍 If payment still fails, the issue might be:");
      console.log("   1. Wrong user account - check MetaMask is on correct account");
      console.log("   2. Order has designated payer - only specific address can pay");
      console.log("   3. Frontend caching stale allowance - refresh the page");
      console.log("   4. RPC node issue - try different RPC or wait and retry");
      console.log("   5. Token address mismatch - order might use different token");
    }

    // Final check - simulate a payment transaction
    console.log("\n🎯 Simulating Payment Transaction:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    try {
      // Try to estimate gas for a transferFrom (what the contract would do)
      const testAmount = ethers.utils.parseUnits("10", 6);

      // Check if we can simulate transferFrom
      console.log("Testing transferFrom simulation...");
      console.log(`  From: ${signer.address}`);
      console.log(`  To: ${PAYMENT_GATEWAY_V2}`);
      console.log(`  Amount: 10 USDC`);

      // This won't actually execute, just estimates gas
      try {
        const gas = await usdc.transferFrom.estimateGas(
          signer.address,
          PAYMENT_GATEWAY_V2,
          testAmount,
          { from: PAYMENT_GATEWAY_V2 }  // Simulate as if gateway is calling
        );
        console.log("  ✅ TransferFrom would succeed! Gas estimate:", gas.toString());
      } catch (error) {
        console.log("  ❌ TransferFrom would fail:", error.message);

        // Extract the specific error
        if (error.message.includes("insufficient allowance")) {
          console.log("     → Allowance issue confirmed");
        } else if (error.message.includes("transfer amount exceeds balance")) {
          console.log("     → Balance insufficient");
        } else {
          console.log("     → Other error");
        }
      }

    } catch (error) {
      console.log("❌ Simulation error:", error.message);
    }

  } catch (error) {
    console.log("❌ Error during analysis:", error);
    console.error(error);
  }

  console.log("\n======================================================================");
  console.log("📝 Summary: Check the diagnosis above for specific issues");
  console.log("======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });