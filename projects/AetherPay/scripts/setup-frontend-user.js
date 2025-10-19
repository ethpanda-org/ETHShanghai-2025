const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔧 Setting Up Frontend User Account");
  console.log("======================================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deployer account:", deployer.address);

  // Frontend user address from the error logs
  const FRONTEND_USER = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";
  console.log("🎯 Target frontend user:", FRONTEND_USER);

  // Contract addresses
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  // Get contracts
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  // ERC20 ABI with mint function
  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount) returns (bool)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, deployer);
  const usdt = new ethers.Contract(MOCK_USDT, ERC20_ABI, deployer);

  console.log("\n💰 Step 1: Check Frontend User Current Status");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Check balances
  const usdcBalance = await usdc.balanceOf(FRONTEND_USER);
  const usdtBalance = await usdt.balanceOf(FRONTEND_USER);
  const usdcAllowance = await usdc.allowance(FRONTEND_USER, PAYMENT_GATEWAY_V2);
  const usdtAllowance = await usdt.allowance(FRONTEND_USER, PAYMENT_GATEWAY_V2);

  console.log("USDC Balance:", ethers.utils.formatUnits(usdcBalance, 6), "USDC");
  console.log("USDC Allowance:", usdcAllowance.eq(ethers.constants.MaxUint256) ? "MAX" : ethers.utils.formatUnits(usdcAllowance, 6), "USDC");
  console.log("USDT Balance:", ethers.utils.formatUnits(usdtBalance, 6), "USDT");
  console.log("USDT Allowance:", usdtAllowance.eq(ethers.constants.MaxUint256) ? "MAX" : ethers.utils.formatUnits(usdtAllowance, 6), "USDT");

  console.log("\n💸 Step 2: Mint Tokens to Frontend User");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Mint tokens if balance is low
  const MIN_BALANCE = ethers.utils.parseUnits("100", 6);  // 100 tokens minimum

  if (usdcBalance.lt(MIN_BALANCE)) {
    console.log("Minting 1000 USDC to frontend user...");
    const mintAmount = ethers.utils.parseUnits("1000", 6);

    try {
      const mintTx = await usdc.mint(FRONTEND_USER, mintAmount);
      console.log("   TX Hash:", mintTx.hash);
      await mintTx.wait();
      console.log("   ✅ 1000 USDC minted!");
    } catch (error) {
      // Try transfer instead if mint fails
      console.log("   Mint failed, trying transfer from deployer...");
      const transferTx = await usdc.transfer(FRONTEND_USER, mintAmount);
      console.log("   TX Hash:", transferTx.hash);
      await transferTx.wait();
      console.log("   ✅ 1000 USDC transferred!");
    }

    // Verify new balance
    const newBalance = await usdc.balanceOf(FRONTEND_USER);
    console.log("   New USDC Balance:", ethers.utils.formatUnits(newBalance, 6), "USDC");
  } else {
    console.log("✅ USDC balance sufficient:", ethers.utils.formatUnits(usdcBalance, 6), "USDC");
  }

  if (usdtBalance.lt(MIN_BALANCE)) {
    console.log("\nMinting 1000 USDT to frontend user...");
    const mintAmount = ethers.utils.parseUnits("1000", 6);

    try {
      const mintTx = await usdt.mint(FRONTEND_USER, mintAmount);
      console.log("   TX Hash:", mintTx.hash);
      await mintTx.wait();
      console.log("   ✅ 1000 USDT minted!");
    } catch (error) {
      // Try transfer instead if mint fails
      console.log("   Mint failed, trying transfer from deployer...");
      const transferTx = await usdt.transfer(FRONTEND_USER, mintAmount);
      console.log("   TX Hash:", transferTx.hash);
      await transferTx.wait();
      console.log("   ✅ 1000 USDT transferred!");
    }

    // Verify new balance
    const newBalance = await usdt.balanceOf(FRONTEND_USER);
    console.log("   New USDT Balance:", ethers.utils.formatUnits(newBalance, 6), "USDT");
  } else {
    console.log("✅ USDT balance sufficient:", ethers.utils.formatUnits(usdtBalance, 6), "USDT");
  }

  console.log("\n🔓 Step 3: Check and Fix Allowances");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Note: We can't directly set allowance for another account
  // The frontend user needs to approve themselves
  // Let's create a helper script they can run

  if (!usdcAllowance.eq(ethers.constants.MaxUint256)) {
    console.log("⚠️  USDC allowance not set for frontend user");
    console.log("   Frontend user needs to approve manually in the app or via:");
    console.log(`   Connect MetaMask to account: ${FRONTEND_USER}`);
    console.log("   Then approve USDC for PaymentGateway");
  } else {
    console.log("✅ USDC allowance already set to MAX for frontend user");
  }

  if (!usdtAllowance.eq(ethers.constants.MaxUint256)) {
    console.log("\n⚠️  USDT allowance not set for frontend user");
    console.log("   Frontend user needs to approve manually");
  } else {
    console.log("✅ USDT allowance already set to MAX for frontend user");
  }

  // Check if frontend user is registered as merchant
  console.log("\n👤 Step 4: Check Merchant Registration");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  try {
    const merchantInfo = await gateway.getMerchantInfo(FRONTEND_USER);
    if (merchantInfo[5]) { // isActive
      console.log("✅ Frontend user is registered as merchant");
      console.log("   Business Name:", merchantInfo[0]);
    } else {
      console.log("❌ Frontend user is not an active merchant");
      console.log("   They need to register in the frontend");
    }
  } catch (error) {
    console.log("❌ Frontend user is not registered as merchant");
    console.log("   They need to register in the frontend");
  }

  console.log("\n📋 Step 5: Create Script for Frontend User");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Create a script the frontend user can run
  const userScript = `
// Save this as approve-tokens-user.js and run with:
// npx hardhat run scripts/approve-tokens-user.js --network op-sepolia

const { ethers } = require("hardhat");

async function main() {
  // This will use the account from PRIVATE_KEY in .env
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  // IMPORTANT: Make sure this matches ${FRONTEND_USER}
  if (signer.address.toLowerCase() !== "${FRONTEND_USER}".toLowerCase()) {
    console.error("❌ Wrong account! Expected: ${FRONTEND_USER}");
    console.error("   Got:", signer.address);
    console.error("   Update your .env PRIVATE_KEY to match the frontend account");
    process.exit(1);
  }

  const PAYMENT_GATEWAY_V2 = "${PAYMENT_GATEWAY_V2}";
  const MOCK_USDC = "${MOCK_USDC}";
  const MOCK_USDT = "${MOCK_USDT}";

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, signer);
  const usdt = new ethers.Contract(MOCK_USDT, ERC20_ABI, signer);

  console.log("\\nApproving USDC...");
  const usdcTx = await usdc.approve(PAYMENT_GATEWAY_V2, ethers.constants.MaxUint256);
  await usdcTx.wait();
  console.log("✅ USDC approved!");

  console.log("\\nApproving USDT...");
  const usdtTx = await usdt.approve(PAYMENT_GATEWAY_V2, ethers.constants.MaxUint256);
  await usdtTx.wait();
  console.log("✅ USDT approved!");

  // Verify
  const usdcAllowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
  const usdtAllowance = await usdt.allowance(signer.address, PAYMENT_GATEWAY_V2);

  console.log("\\n✅ Allowances set:");
  console.log("   USDC:", usdcAllowance.eq(ethers.constants.MaxUint256) ? "MAX" : "ERROR");
  console.log("   USDT:", usdtAllowance.eq(ethers.constants.MaxUint256) ? "MAX" : "ERROR");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
`;

  // Save the script
  const fs = require('fs').promises;
  await fs.writeFile('scripts/approve-tokens-user.js', userScript);
  console.log("✅ Created script: scripts/approve-tokens-user.js");

  console.log("\n✅ Setup Complete!");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  console.log("📝 Summary for Frontend User:", FRONTEND_USER);
  console.log("");

  // Final balance check
  const finalUsdcBalance = await usdc.balanceOf(FRONTEND_USER);
  const finalUsdtBalance = await usdt.balanceOf(FRONTEND_USER);
  const finalUsdcAllowance = await usdc.allowance(FRONTEND_USER, PAYMENT_GATEWAY_V2);
  const finalUsdtAllowance = await usdt.allowance(FRONTEND_USER, PAYMENT_GATEWAY_V2);

  console.log("💰 Token Balances:");
  console.log("   USDC:", ethers.utils.formatUnits(finalUsdcBalance, 6), finalUsdcBalance.eq(0) ? "❌ NEEDS TOKENS" : "✅");
  console.log("   USDT:", ethers.utils.formatUnits(finalUsdtBalance, 6), finalUsdtBalance.eq(0) ? "❌ NEEDS TOKENS" : "✅");

  console.log("\n🔓 Allowances:");
  console.log("   USDC:", finalUsdcAllowance.eq(ethers.constants.MaxUint256) ? "✅ MAX" : `❌ ${ethers.utils.formatUnits(finalUsdcAllowance, 6)}`);
  console.log("   USDT:", finalUsdtAllowance.eq(ethers.constants.MaxUint256) ? "✅ MAX" : `❌ ${ethers.utils.formatUnits(finalUsdtAllowance, 6)}`);

  if (!finalUsdcAllowance.eq(ethers.constants.MaxUint256) || !finalUsdtAllowance.eq(ethers.constants.MaxUint256)) {
    console.log("\n⚠️  IMPORTANT: Frontend user needs to approve tokens!");
    console.log("\n📌 Option 1: Use the Approve button in the frontend payment page");
    console.log("\n📌 Option 2: Run this command with the frontend user's private key:");
    console.log("   1. Update .env with PRIVATE_KEY for", FRONTEND_USER);
    console.log("   2. Run: npx hardhat run scripts/approve-tokens-user.js --network op-sepolia");
    console.log("\n📌 Option 3: Manually in the browser console (MetaMask connected):");
    console.log("   Just click the 'Approve' button when trying to pay!");
  }

  console.log("\n💡 Next Steps:");
  console.log("   1. Make sure MetaMask is connected to:", FRONTEND_USER);
  console.log("   2. If allowances show ❌, approve tokens in the frontend");
  console.log("   3. Try making a payment with the test orders");

  console.log("\n======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });