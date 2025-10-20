const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔧 Fixing Allowance Issue - Automated Solution");
  console.log("======================================================================\n");

  const [signer] = await ethers.getSigners();
  console.log("📝 Using account:", signer.address);

  // Contract addresses
  const PAYMENT_GATEWAY_V2 = "0x65E71cA6C9bD72eceAd2de0Ed06BF135BBfc31b3";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  
  // Get contracts
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);
  const usdc = await ethers.getContractAt("MockERC20", MOCK_USDC);

  console.log("\n📊 Current Status:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Check current state
  const balance = await usdc.balanceOf(signer.address);
  const allowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
  const decimals = await usdc.decimals();

  console.log("Balance:", ethers.formatUnits(balance, decimals), "USDC");
  console.log("Current Allowance:", ethers.formatUnits(allowance, decimals), "USDC");

  // Step 1: Ensure user has tokens
  if (balance === 0n) {
    console.log("\n🪙 Step 1: Getting test tokens...");
    console.log("─────────────────────────────────────────────────────────────────────\n");
    
    try {
      // Mint 1000 USDC
      const mintAmount = ethers.parseUnits("1000", decimals);
      console.log("Minting 1000 USDC...");
      
      const mintTx = await usdc.mint(signer.address, mintAmount);
      await mintTx.wait();
      
      const newBalance = await usdc.balanceOf(signer.address);
      console.log("✅ Minted successfully! New balance:", ethers.formatUnits(newBalance, decimals), "USDC");
    } catch (error) {
      console.log("❌ Failed to mint tokens:", error.message);
      console.log("💡 Try running: npx hardhat run scripts/get-test-tokens.js --network op-sepolia");
      return;
    }
  } else {
    console.log("✅ User has sufficient balance");
  }

  // Step 2: Fix allowance
  console.log("\n🔓 Step 2: Setting up allowance...");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  try {
    // Some tokens require resetting allowance to 0 first
    if (allowance > 0n) {
      console.log("Resetting allowance to 0...");
      const resetTx = await usdc.approve(PAYMENT_GATEWAY_V2, 0);
      await resetTx.wait();
      console.log("✅ Allowance reset to 0");
    }

    // Set unlimited allowance (common practice)
    const maxAllowance = ethers.MaxUint256;
    console.log("Setting unlimited allowance...");
    
    const approveTx = await usdc.approve(PAYMENT_GATEWAY_V2, maxAllowance);
    console.log("Transaction hash:", approveTx.hash);
    
    console.log("Waiting for confirmation...");
    await approveTx.wait();
    
    // Verify new allowance
    const newAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
    console.log("✅ New allowance:", ethers.formatUnits(newAllowance, decimals), "USDC");
    
    if (newAllowance >= ethers.parseUnits("1000000", decimals)) {
      console.log("✅ Unlimited allowance set successfully!");
    }

  } catch (error) {
    console.log("❌ Failed to set allowance:", error.message);
    
    // Try alternative approach
    console.log("\n🔄 Trying alternative approach...");
    try {
      // Set a large but not unlimited allowance
      const largeAllowance = ethers.parseUnits("1000000", decimals); // 1M USDC
      const approveTx = await usdc.approve(PAYMENT_GATEWAY_V2, largeAllowance);
      await approveTx.wait();
      
      const newAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
      console.log("✅ Large allowance set:", ethers.formatUnits(newAllowance, decimals), "USDC");
    } catch (altError) {
      console.log("❌ Alternative approach also failed:", altError.message);
      return;
    }
  }

  // Step 3: Test payment simulation
  console.log("\n🧪 Step 3: Testing payment simulation...");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Create a test order first
  try {
    console.log("Checking if user is registered as merchant...");
    let merchantInfo;
    try {
      merchantInfo = await gateway.getMerchantInfo(signer.address);
      if (!merchantInfo[5]) { // isActive
        throw new Error("Not active merchant");
      }
      console.log("✅ User is registered as active merchant");
    } catch (error) {
      console.log("Registering as merchant...");
      const registerTx = await gateway.registerMerchant("Test Merchant");
      await registerTx.wait();
      console.log("✅ Registered as merchant");
    }

    // Create test order
    const testOrderId = "TEST_" + Date.now();
    const orderAmount = ethers.parseUnits("1", decimals); // 1 USDC
    
    console.log(`Creating test order: ${testOrderId}`);
    const createOrderTx = await gateway.createOrder(
      testOrderId,
      orderAmount,
      MOCK_USDC,
      MOCK_USDC, // Same token for simplicity
      "ipfs://test",
      false, // no partial payment
      ethers.ZeroAddress // designatedPayer - address(0) for public order
    );
    await createOrderTx.wait();
    console.log("✅ Test order created");

    // Test payment
    const orderIdBytes32 = ethers.encodeBytes32String(testOrderId);
    console.log("Testing payment simulation...");
    
    try {
      const gasEstimate = await gateway.processPayment.estimateGas(orderIdBytes32, orderAmount);
      console.log("✅ Payment simulation successful! Gas estimate:", gasEstimate.toString());
      console.log("🎉 Everything is working correctly!");
      
      // Clean up - cancel the test order
      console.log("Cleaning up test order...");
      // Note: You might want to add a cancel function to your contract
      
    } catch (payError) {
      console.log("❌ Payment simulation failed:", payError.message);
      
      // Additional debugging
      const currentAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
      const currentBalance = await usdc.balanceOf(signer.address);
      
      console.log("\n🔍 Debug Info:");
      console.log("Current allowance:", ethers.formatUnits(currentAllowance, decimals));
      console.log("Current balance:", ethers.formatUnits(currentBalance, decimals));
      console.log("Required amount:", ethers.formatUnits(orderAmount, decimals));
      console.log("Allowance sufficient:", currentAllowance >= orderAmount);
      console.log("Balance sufficient:", currentBalance >= orderAmount);
    }

  } catch (error) {
    console.log("❌ Error in payment test:", error.message);
  }

  console.log("\n💡 Summary:");
  console.log("─────────────────────────────────────────────────────────────────────\n");
  console.log("1. ✅ Check your wallet for the approval transaction");
  console.log("2. ✅ Refresh the payment page and try again");
  console.log("3. ✅ The allowance should now be sufficient for payments");
  console.log("4. 🔍 If issues persist, check the browser console for detailed logs");

  console.log("\n======================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
