const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔧 FIX: Setting Up Proper Allowance and Creating Test Order");
  console.log("======================================================================\n");

  const [signer] = await ethers.getSigners();
  console.log("📝 Using account:", signer.address);

  // Contract addresses from deployment
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  // Get contracts
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  // ERC20 ABI
  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, signer);
  const usdt = new ethers.Contract(MOCK_USDT, ERC20_ABI, signer);

  console.log("\n💰 Step 1: Check Current Status");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Check balances
  const usdcBalance = await usdc.balanceOf(signer.address);
  const usdtBalance = await usdt.balanceOf(signer.address);
  const usdcAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
  const usdtAllowance = await usdt.allowance(signer.address, PAYMENT_GATEWAY_V2);

  console.log("USDC Balance:", ethers.utils.formatUnits(usdcBalance, 6), "USDC");
  console.log("USDC Allowance:", ethers.utils.formatUnits(usdcAllowance, 6), "USDC");
  console.log("USDT Balance:", ethers.utils.formatUnits(usdtBalance, 6), "USDT");
  console.log("USDT Allowance:", ethers.utils.formatUnits(usdtAllowance, 6), "USDT");

  // Check if merchant is registered
  try {
    const merchantInfo = await gateway.getMerchantInfo(signer.address);
    console.log("\n✅ Merchant Status:", merchantInfo[5] ? "Active" : "Inactive");
    console.log("   Business Name:", merchantInfo[0]);
  } catch (error) {
    console.log("\n❌ Not registered as merchant. Registering now...");

    try {
      const registerTx = await gateway.registerMerchant("Test Frontend Merchant");
      console.log("   Registering merchant... TX:", registerTx.hash);
      await registerTx.wait();
      console.log("   ✅ Merchant registered successfully!");
    } catch (regError) {
      if (regError.message.includes("Already registered")) {
        console.log("   ℹ️  Already registered");
      } else {
        console.log("   ❌ Registration failed:", regError.message);
      }
    }
  }

  console.log("\n💳 Step 2: Set Maximum Allowance for Both Tokens");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const MAX_ALLOWANCE = ethers.constants.MaxUint256;

  // Set USDC allowance if not already max
  if (!usdcAllowance.eq(MAX_ALLOWANCE)) {
    console.log("Setting USDC allowance to MAX...");

    // If allowance > 0, might need to reset to 0 first for some tokens
    if (usdcAllowance.gt(0)) {
      console.log("   Resetting to 0 first...");
      const resetTx = await usdc.approve(PAYMENT_GATEWAY_V2, 0);
      await resetTx.wait();
      console.log("   ✅ Reset complete");
    }

    const approveTx = await usdc.approve(PAYMENT_GATEWAY_V2, MAX_ALLOWANCE);
    console.log("   TX Hash:", approveTx.hash);
    await approveTx.wait();
    console.log("   ✅ USDC allowance set to MAX!");

    // Verify
    const newAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
    console.log("   Verified allowance:", newAllowance.eq(MAX_ALLOWANCE) ? "MAX ✅" : ethers.utils.formatUnits(newAllowance, 6));
  } else {
    console.log("✅ USDC allowance already set to MAX");
  }

  // Set USDT allowance if not already max
  if (!usdtAllowance.eq(MAX_ALLOWANCE)) {
    console.log("\nSetting USDT allowance to MAX...");

    // If allowance > 0, might need to reset to 0 first for some tokens
    if (usdtAllowance.gt(0)) {
      console.log("   Resetting to 0 first...");
      const resetTx = await usdt.approve(PAYMENT_GATEWAY_V2, 0);
      await resetTx.wait();
      console.log("   ✅ Reset complete");
    }

    const approveTx = await usdt.approve(PAYMENT_GATEWAY_V2, MAX_ALLOWANCE);
    console.log("   TX Hash:", approveTx.hash);
    await approveTx.wait();
    console.log("   ✅ USDT allowance set to MAX!");

    // Verify
    const newAllowance = await usdt.allowance(signer.address, PAYMENT_GATEWAY_V2);
    console.log("   Verified allowance:", newAllowance.eq(MAX_ALLOWANCE) ? "MAX ✅" : ethers.utils.formatUnits(newAllowance, 6));
  } else {
    console.log("✅ USDT allowance already set to MAX");
  }

  console.log("\n📦 Step 3: Create Test Orders");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Generate unique order IDs
  const timestamp = Date.now();
  const orderIdPublic = `TEST_PUBLIC_${timestamp}`;
  const orderIdDesignated = `TEST_DESIGNATED_${timestamp}`;

  try {
    // Create a public order (anyone can pay)
    console.log("Creating public order (anyone can pay)...");
    const publicOrderTx = await gateway.createOrder(
      orderIdPublic,
      ethers.utils.parseUnits("10", 6), // 10 USDC
      MOCK_USDC, // payment token
      MOCK_USDT, // settlement token
      "", // no metadata URI
      false, // no partial payment
      ethers.constants.AddressZero // public order - anyone can pay
    );
    console.log("   TX Hash:", publicOrderTx.hash);
    await publicOrderTx.wait();
    console.log("   ✅ Public Order Created:", orderIdPublic);

    // Create a designated payer order (only signer can pay)
    console.log("\nCreating designated payer order (only you can pay)...");
    const designatedOrderTx = await gateway.createOrder(
      orderIdDesignated,
      ethers.utils.parseUnits("5", 6), // 5 USDC
      MOCK_USDC, // payment token
      MOCK_USDC, // same token settlement (simpler)
      "", // no metadata URI
      false, // no partial payment
      signer.address // only signer can pay this
    );
    console.log("   TX Hash:", designatedOrderTx.hash);
    await designatedOrderTx.wait();
    console.log("   ✅ Designated Order Created:", orderIdDesignated);

  } catch (error) {
    console.log("❌ Error creating orders:", error.message);
  }

  console.log("\n📋 Step 4: Verify Orders");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  try {
    // Check public order
    const publicOrder = await gateway.getOrderDetailsByString(orderIdPublic);
    console.log("Public Order Details:");
    console.log("   Order ID:", orderIdPublic);
    console.log("   Amount:", ethers.utils.formatUnits(publicOrder[3], 6), "USDC");
    console.log("   Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][publicOrder[8]]);
    console.log("   Payer:", publicOrder[2] === ethers.constants.AddressZero ? "Anyone (public)" : publicOrder[2]);

    // Check designated order
    const designatedOrder = await gateway.getOrderDetailsByString(orderIdDesignated);
    console.log("\nDesignated Order Details:");
    console.log("   Order ID:", orderIdDesignated);
    console.log("   Amount:", ethers.utils.formatUnits(designatedOrder[3], 6), "USDC");
    console.log("   Status:", ["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED"][designatedOrder[8]]);
    console.log("   Payer:", designatedOrder[2]);

  } catch (error) {
    console.log("❌ Error checking orders:", error.message);
  }

  console.log("\n✅ Setup Complete!");
  console.log("─────────────────────────────────────────────────────────────────────\n");
  console.log("You can now test payments with these order IDs in the frontend:");
  console.log("   Public Order (anyone can pay):", orderIdPublic);
  console.log("   Designated Order (only you):", orderIdDesignated);
  console.log("\nMake sure your MetaMask is connected to:", signer.address);
  console.log("\n📝 Payment URLs:");
  console.log(`   http://localhost:3000/pay/${orderIdPublic}`);
  console.log(`   http://localhost:3000/pay/${orderIdDesignated}`);

  console.log("\n💡 If payment still fails after this setup:");
  console.log("   1. Make sure MetaMask is on the correct network (OP Sepolia)");
  console.log("   2. Make sure MetaMask account matches:", signer.address);
  console.log("   3. Refresh the payment page (Ctrl+F5) to clear any cache");
  console.log("   4. Check browser console for detailed error messages");

  console.log("\n======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });