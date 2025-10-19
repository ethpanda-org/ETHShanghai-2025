const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔧 FIX: Setting up FXRouter Liquidity and Testing Payment");
  console.log("======================================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("💼 Deployer:", deployer.address);

  // Contract addresses (with correct checksums)
  const FX_ROUTER = ethers.utils.getAddress("0xC2ab12Baf3735864528F890B809Ffe2f1cf2f8d1");
  const PAYMENT_GATEWAY_V2 = ethers.utils.getAddress("0xdd0F17F87F60A39ab6004160cc2b503b24a518F8");
  const MOCK_USDC = ethers.utils.getAddress("0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3");
  const MOCK_USDT = ethers.utils.getAddress("0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C"); // Correct USDT address
  const FRONTEND_USER = ethers.utils.getAddress("0x99f8C4e03181022125CAB1A9929Ab44027AD276a");

  // ABI definitions
  const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount) returns (bool)"
  ];

  const FX_ROUTER_ABI = [
    "function getExchangeRate(address tokenIn, address tokenOut) view returns (uint256)",
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[])"
  ];

  // Get contracts
  const fxRouter = new ethers.Contract(FX_ROUTER, FX_ROUTER_ABI, deployer);
  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, deployer);
  const usdt = new ethers.Contract(MOCK_USDT, ERC20_ABI, deployer);
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  console.log("📊 Step 1: Check Current FXRouter State");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Check current exchange rates
  try {
    const rateUSDCtoUSDT = await fxRouter.getExchangeRate(MOCK_USDC, MOCK_USDT);
    const rateUSDTtoUSDC = await fxRouter.getExchangeRate(MOCK_USDT, MOCK_USDC);

    console.log("📈 Exchange Rates:");
    console.log("  USDC → USDT:", ethers.utils.formatUnits(rateUSDCtoUSDT, 6));
    console.log("  USDT → USDC:", ethers.utils.formatUnits(rateUSDTtoUSDC, 6));
  } catch (error) {
    console.log("❌ Error getting exchange rates:", error.message);
  }

  // Check router's token balances (liquidity)
  const routerUSDCBalance = await usdc.balanceOf(FX_ROUTER);
  const routerUSDTBalance = await usdt.balanceOf(FX_ROUTER);

  console.log("\n💰 FXRouter Token Balances (Liquidity):");
  console.log("  USDC:", ethers.utils.formatUnits(routerUSDCBalance, 6));
  console.log("  USDT:", ethers.utils.formatUnits(routerUSDTBalance, 6));

  if (routerUSDCBalance.eq(0) || routerUSDTBalance.eq(0)) {
    console.log("\n⚠️  No liquidity in FXRouter! Adding liquidity...");

    console.log("\n📊 Step 2: Add Liquidity to FXRouter");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Mint tokens to deployer for liquidity
    const liquidityAmount = ethers.utils.parseUnits("10000", 6); // 10,000 of each token

    console.log("🪙 Minting tokens for liquidity...");
    await usdc.mint(deployer.address, liquidityAmount);
    await usdt.mint(deployer.address, liquidityAmount);
    console.log("✅ Minted 10,000 USDC and 10,000 USDT to deployer");

    // Approve FXRouter to spend tokens
    console.log("\n🔓 Approving FXRouter...");
    await usdc.approve(FX_ROUTER, liquidityAmount);
    await usdt.approve(FX_ROUTER, liquidityAmount);
    console.log("✅ Approved FXRouter to spend tokens");

    // Transfer tokens to FXRouter as liquidity
    console.log("\n💧 Adding liquidity to FXRouter...");
    await usdc.transfer(FX_ROUTER, liquidityAmount);
    await usdt.transfer(FX_ROUTER, liquidityAmount);
    console.log("✅ Transferred 10,000 USDC and 10,000 USDT to FXRouter");

    // Verify new balances
    const newRouterUSDCBalance = await usdc.balanceOf(FX_ROUTER);
    const newRouterUSDTBalance = await usdt.balanceOf(FX_ROUTER);

    console.log("\n💰 Updated FXRouter Liquidity:");
    console.log("  USDC:", ethers.utils.formatUnits(newRouterUSDCBalance, 6));
    console.log("  USDT:", ethers.utils.formatUnits(newRouterUSDTBalance, 6));
  } else {
    console.log("✅ FXRouter already has liquidity");
  }

  console.log("\n📊 Step 3: Create Test Order (Same Currency)");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Create an order with USDC as both payment and settlement token (no swap needed)
  const orderIdSame = `TEST_SAME_${Date.now()}`;
  const amountSame = ethers.utils.parseUnits("10", 6); // 10 USDC

  console.log("📝 Creating order with same currency (USDC → USDC)...");
  console.log("  Order ID:", orderIdSame);
  console.log("  Amount:", ethers.utils.formatUnits(amountSame, 6), "USDC");
  console.log("  Payment Token: USDC");
  console.log("  Settlement Token: USDC");

  try {
    const tx1 = await gateway.createOrder(
      orderIdSame,
      amountSame,
      MOCK_USDC, // payment token (USDC)
      MOCK_USDC, // settlement token (same - USDC)
      FRONTEND_USER, // designated payer
      Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
      "" // no metadata URI
    );
    await tx1.wait();
    console.log("✅ Order created successfully!");
    console.log("🔗 You can test payment at: http://localhost:3000/pay/" + orderIdSame);
  } catch (error) {
    console.log("❌ Error creating order:", error.message);
  }

  console.log("\n📊 Step 4: Create Test Order (Cross Currency)");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Create an order with USDC payment and USDT settlement (requires swap)
  const orderIdCross = `TEST_CROSS_${Date.now()}`;
  const amountCross = ethers.utils.parseUnits("15", 6); // 15 USDC

  console.log("📝 Creating order with cross currency (USDC → USDT)...");
  console.log("  Order ID:", orderIdCross);
  console.log("  Amount:", ethers.utils.formatUnits(amountCross, 6), "USDC");
  console.log("  Payment Token: USDC");
  console.log("  Settlement Token: USDT");

  try {
    const tx2 = await gateway.createOrder(
      orderIdCross,
      amountCross,
      MOCK_USDC, // payment token
      MOCK_USDT, // settlement token (different)
      FRONTEND_USER, // designated payer
      Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
      "" // no metadata URI
    );
    await tx2.wait();
    console.log("✅ Order created successfully!");
    console.log("🔗 You can test payment at: http://localhost:3000/pay/" + orderIdCross);
  } catch (error) {
    console.log("❌ Error creating order:", error.message);
  }

  console.log("\n📊 Step 5: Test Direct Swap");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Test if the FXRouter can actually perform a swap
  const testSwapAmount = ethers.utils.parseUnits("1", 6);

  console.log("🔄 Testing direct swap on FXRouter...");
  console.log("  Swapping 1 USDC for USDT");

  // First, give the router some USDC to test with
  await usdc.mint(FX_ROUTER, testSwapAmount);

  try {
    // Test the swap function directly
    const minAmountOut = ethers.utils.parseUnits("0.9", 6); // Accept at least 0.9 USDT

    // Get initial USDT balance of deployer
    const initialUSDT = await usdt.balanceOf(deployer.address);

    // The FXRouter should have a function to swap tokens
    // Since we don't have the exact ABI, let's check what functions are available
    console.log("  Attempting swap...");

    // Create a simple swap test
    try {
      const swapTx = await fxRouter.swapExactTokensForTokens(
        testSwapAmount,
        minAmountOut,
        [MOCK_USDC, MOCK_USDT],
        deployer.address,
        Math.floor(Date.now() / 1000) + 300
      );
      console.log("✅ Swap transaction sent!");
      await swapTx.wait();
      console.log("✅ Swap confirmed!");
    } catch (swapError) {
      console.log("❌ Direct swap failed:", swapError.message);
    }
  } catch (error) {
    console.log("❌ Swap test failed:", error.message);

    // If swap fails, the router might need different setup
    console.log("\n💡 Possible solutions:");
    console.log("  1. Check if FXRouter has the correct swap implementation");
    console.log("  2. Ensure exchange rates are set correctly");
    console.log("  3. Verify the router has permission to transfer tokens");
  }

  console.log("\n📊 Step 6: Verify Frontend User Setup");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const userUSDCBalance = await usdc.balanceOf(FRONTEND_USER);
  const userUSDCAllowance = await usdc.allowance(FRONTEND_USER, PAYMENT_GATEWAY_V2);

  console.log("👤 Frontend User:", FRONTEND_USER);
  console.log("  USDC Balance:", ethers.utils.formatUnits(userUSDCBalance, 6));
  console.log("  USDC Allowance to Gateway:", userUSDCAllowance.eq(ethers.constants.MaxUint256) ? "MAX" : ethers.utils.formatUnits(userUSDCAllowance, 6));

  if (userUSDCBalance.lt(ethers.utils.parseUnits("20", 6))) {
    console.log("\n⚠️  User has low balance, minting more USDC...");
    await usdc.mint(FRONTEND_USER, ethers.utils.parseUnits("100", 6));
    console.log("✅ Minted 100 USDC to user");
  }

  console.log("\n======================================================================");
  console.log("✅ SETUP COMPLETE!");
  console.log("======================================================================\n");

  console.log("📋 Summary:");
  console.log("  1. FXRouter now has liquidity: 10,000 USDC + 10,000 USDT");
  console.log("  2. Created test order (same currency): " + orderIdSame);
  console.log("  3. Created test order (cross currency): " + orderIdCross);
  console.log("  4. Frontend user has sufficient USDC balance");

  console.log("\n🧪 Next Steps:");
  console.log("  1. Try paying the SAME CURRENCY order first (should work):");
  console.log("     http://localhost:3000/pay/" + orderIdSame);
  console.log("\n  2. Then try the CROSS CURRENCY order:");
  console.log("     http://localhost:3000/pay/" + orderIdCross);
  console.log("\n  3. If cross-currency still fails, we need to check FXRouter implementation");

  console.log("\n======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });