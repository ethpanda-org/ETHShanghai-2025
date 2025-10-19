const { ethers } = require("hardhat");

async function main() {
  console.log("\n🧪 Quick Test: Verifying Order Creation with 7 Parameters\n");

  const [signer] = await ethers.getSigners();
  console.log("Account:", signer.address);

  // Contract address - 使用您提供的地址
  const GATEWAY = "0x4995168d409767330d9693034d5cffc7daffb89b";
  const USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";

  // Get contract
  const gateway = await ethers.getContractAt("PaymentGatewayV2", GATEWAY);

  // Check if registered as merchant
  console.log("\n1️⃣ Checking merchant status...");
  try {
    const info = await gateway.getMerchantInfo(signer.address);
    if (!info[5]) { // isActive
      console.log("   Registering as merchant...");
      const tx = await gateway.registerMerchant("Test Merchant");
      await tx.wait();
      console.log("   ✅ Registered!");
    } else {
      console.log("   ✅ Already registered");
    }
  } catch (e) {
    console.log("   Registering as merchant...");
    const tx = await gateway.registerMerchant("Test Merchant");
    await tx.wait();
    console.log("   ✅ Registered!");
  }

  // Test 1: Create PUBLIC order (anyone can pay)
  console.log("\n2️⃣ Creating PUBLIC order (7 params, last = address(0))...");
  const publicOrderId = "PUBLIC_" + Date.now();

  try {
    const tx1 = await gateway.createOrder(
      publicOrderId,
      ethers.parseUnits("1", 6), // 1 USDC
      USDC, // payment token
      USDC, // settlement token
      "ipfs://test",
      false, // no partial payment
      ethers.ZeroAddress // 🔑 PUBLIC ORDER - anyone can pay!
    );
    console.log("   Tx sent:", tx1.hash);
    await tx1.wait();
    console.log("   ✅ Public order created successfully!");

    // Verify the order
    const order1 = await gateway.getOrderDetailsByString(publicOrderId);
    console.log("   Payer field:", order1[2]);
    if (order1[2] === ethers.ZeroAddress) {
      console.log("   ✅ CORRECT: Payer is address(0) for public order");
    } else {
      console.log("   ❌ ERROR: Payer should be address(0) but is:", order1[2]);
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
  }

  // Test 2: Create DESIGNATED order (only specific buyer can pay)
  console.log("\n3️⃣ Creating DESIGNATED order (7 params, last = buyer address)...");
  const designatedOrderId = "DESIGNATED_" + Date.now();
  const designatedBuyer = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4"; // Example address

  try {
    const tx2 = await gateway.createOrder(
      designatedOrderId,
      ethers.parseUnits("1", 6),
      USDC,
      USDC,
      "ipfs://test",
      false,
      designatedBuyer // 🔑 DESIGNATED ORDER - only this address can pay!
    );
    console.log("   Tx sent:", tx2.hash);
    await tx2.wait();
    console.log("   ✅ Designated order created successfully!");

    // Verify the order
    const order2 = await gateway.getOrderDetailsByString(designatedOrderId);
    console.log("   Payer field:", order2[2]);
    if (order2[2].toLowerCase() === designatedBuyer.toLowerCase()) {
      console.log("   ✅ CORRECT: Payer is set to designated buyer");
    } else {
      console.log("   ❌ ERROR: Payer should be", designatedBuyer, "but is:", order2[2]);
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
  }

  // Test 3: Try OLD way with 6 params (should fail or cause issues)
  console.log("\n4️⃣ Testing OLD way with only 6 params (for comparison)...");
  console.log("   ⚠️  This would cause the bug - skipping to avoid issues");

  console.log("\n" + "=".repeat(60));
  console.log("✅ TEST SUMMARY:");
  console.log("=".repeat(60));
  console.log("1. Public orders: Use ethers.ZeroAddress as 7th param");
  console.log("2. Designated orders: Use buyer address as 7th param");
  console.log("3. NEVER use only 6 params - always pass 7!");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });