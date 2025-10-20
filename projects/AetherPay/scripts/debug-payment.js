const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔍 Debugging Payment Issue");
  console.log("======================================================================\n");

  const [signer] = await ethers.getSigners();
  console.log("📝 Using account:", signer.address);

  // Contract addresses
  const PAYMENT_GATEWAY_V2 = "0x7aC993ee1E0b00C319b90822C701dF61896141BA";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  
  // Order ID from screenshot
  const orderIdString = "APKWR3LQZ";

  // Get contracts
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);
  const usdc = await ethers.getContractAt("MockERC20", MOCK_USDC);

  console.log("\n📊 Checking Order Details:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  try {
    // Get order details
    const orderDetails = await gateway.getOrderDetailsByString(orderIdString);
    
    console.log("Order ID (bytes32):", orderDetails[0]);
    console.log("Merchant:", orderDetails[1]);
    console.log("Payer:", orderDetails[2]);
    console.log("Order Amount (raw):", orderDetails[3].toString());
    console.log("Order Amount (USDC):", ethers.formatUnits(orderDetails[3], 6));
    console.log("Payment Token:", orderDetails[4]);
    console.log("Settlement Token:", orderDetails[5]);
    console.log("Paid Amount (raw):", orderDetails[6].toString());
    console.log("Paid Amount (USDC):", ethers.formatUnits(orderDetails[6], 6));
    console.log("Received Amount (raw):", orderDetails[7].toString());
    console.log("Status:", orderDetails[8]); // 0=Pending, 1=Paid, 2=Completed, 3=Expired
    console.log("Created At:", new Date(Number(orderDetails[9]) * 1000).toLocaleString());
    console.log("Expiry Time:", new Date(Number(orderDetails[10]) * 1000).toLocaleString());
    console.log("Metadata URI:", orderDetails[11]);

    const orderIdBytes32 = orderDetails[0];
    const orderAmountRaw = orderDetails[3];
    const paymentToken = orderDetails[4];
    const orderStatus = orderDetails[8];

    console.log("\n💰 Checking Token Balances:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    const balance = await usdc.balanceOf(signer.address);
    console.log("Your USDC Balance:", ethers.formatUnits(balance, 6), "USDC");

    const allowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
    console.log("Current Allowance:", ethers.formatUnits(allowance, 6), "USDC");

    console.log("\n🔍 Checking Order Status:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    const statusNames = ["Pending", "Paid", "Completed", "Expired"];
    console.log("Order Status:", statusNames[orderStatus], `(${orderStatus})`);

    if (orderStatus !== 0) {
      console.log("\n❌ ERROR: Order is not in Pending status!");
      console.log("   Cannot process payment for orders that are not Pending.");
      return;
    }

    console.log("\n✅ Validation Checks:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Check 1: Balance
    if (balance < orderAmountRaw) {
      console.log("❌ Insufficient balance!");
      console.log(`   Need: ${ethers.formatUnits(orderAmountRaw, 6)} USDC`);
      console.log(`   Have: ${ethers.formatUnits(balance, 6)} USDC`);
    } else {
      console.log("✅ Balance sufficient");
    }

    // Check 2: Allowance
    if (allowance < orderAmountRaw) {
      console.log("❌ Insufficient allowance!");
      console.log(`   Need: ${ethers.formatUnits(orderAmountRaw, 6)} USDC`);
      console.log(`   Have: ${ethers.formatUnits(allowance, 6)} USDC`);
      console.log("\n💡 You need to approve first:");
      console.log(`   await usdc.approve("${PAYMENT_GATEWAY_V2}", "${orderAmountRaw}")`);
    } else {
      console.log("✅ Allowance sufficient");
    }

    // Check 3: Payment token matches
    if (paymentToken.toLowerCase() !== MOCK_USDC.toLowerCase()) {
      console.log("❌ Payment token mismatch!");
      console.log(`   Expected: ${MOCK_USDC}`);
      console.log(`   Got: ${paymentToken}`);
    } else {
      console.log("✅ Payment token matches");
    }

    // Check 4: Contract is not paused
    try {
      const isPaused = await gateway.paused();
      if (isPaused) {
        console.log("❌ Contract is paused!");
      } else {
        console.log("✅ Contract is not paused");
      }
    } catch (e) {
      console.log("⚠️  Could not check paused status");
    }

    console.log("\n🧪 Simulating Payment Transaction:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    try {
      // Try to estimate gas (this will fail if the transaction would revert)
      const gasEstimate = await gateway.processPayment.estimateGas(
        orderIdBytes32,
        orderAmountRaw
      );
      console.log("✅ Gas estimate successful:", gasEstimate.toString());
      console.log("   Transaction should succeed!");
    } catch (error) {
      console.log("❌ Gas estimation failed!");
      console.log("   This means the transaction would revert.");
      console.log("\n📋 Error details:");
      console.log(error.message);
      
      // Try to decode the error
      if (error.data) {
        console.log("\n🔍 Error data:", error.data);
      }
    }

  } catch (error) {
    console.log("❌ Error fetching order details:");
    console.log(error.message);
  }

  console.log("\n======================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

