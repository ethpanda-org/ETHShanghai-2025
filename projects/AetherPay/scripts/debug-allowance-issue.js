const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔍 Debugging Allowance Issue - Comprehensive Analysis");
  console.log("======================================================================\n");

  const [signer] = await ethers.getSigners();
  console.log("📝 Using account:", signer.address);

  // Contract addresses from frontend
  const PAYMENT_GATEWAY_V2 = "0x65E71cA6C9bD72eceAd2de0Ed06BF135BBfc31b3";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  
  // Get contracts
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);
  const usdc = await ethers.getContractAt("MockERC20", MOCK_USDC);

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
    console.log("Total Supply:", ethers.formatUnits(totalSupply, tokenDecimals));

    // Get user balance
    const balance = await usdc.balanceOf(signer.address);
    console.log("Your Balance:", ethers.formatUnits(balance, tokenDecimals), tokenSymbol);

    // Get current allowance
    const allowance = await usdc.allowance(signer.address, PAYMENT_GATEWAY_V2);
    console.log("Current Allowance:", ethers.formatUnits(allowance, tokenDecimals), tokenSymbol);
    console.log("Allowance (raw):", allowance.toString());

    console.log("\n🔍 Allowance Analysis:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Test different amounts
    const testAmounts = [
      ethers.parseUnits("1", tokenDecimals),
      ethers.parseUnits("10", tokenDecimals),
      ethers.parseUnits("100", tokenDecimals)
    ];

    for (const amount of testAmounts) {
      const amountFormatted = ethers.formatUnits(amount, tokenDecimals);
      const hasEnoughAllowance = allowance >= amount;
      const hasEnoughBalance = balance >= amount;
      
      console.log(`Amount: ${amountFormatted} ${tokenSymbol}`);
      console.log(`  - Sufficient allowance: ${hasEnoughAllowance ? '✅' : '❌'}`);
      console.log(`  - Sufficient balance: ${hasEnoughBalance ? '✅' : '❌'}`);
      
      if (!hasEnoughAllowance) {
        console.log(`  - Need to approve: ${ethers.formatUnits(amount - allowance, tokenDecimals)} ${tokenSymbol}`);
      }
      console.log("");
    }

    console.log("\n🧪 Testing Approval Process:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Test approval for 10 USDC
    const approvalAmount = ethers.parseUnits("10", tokenDecimals);
    console.log(`Testing approval for ${ethers.formatUnits(approvalAmount, tokenDecimals)} ${tokenSymbol}...`);

    try {
      // Estimate gas for approval
      const approvalGas = await usdc.approve.estimateGas(PAYMENT_GATEWAY_V2, approvalAmount);
      console.log("✅ Approval gas estimate:", approvalGas.toString());

      // Check if we need to reset allowance first (some tokens require this)
      if (allowance > 0n) {
        console.log("⚠️  Current allowance > 0, may need to reset to 0 first");
        try {
          const resetGas = await usdc.approve.estimateGas(PAYMENT_GATEWAY_V2, 0);
          console.log("✅ Reset allowance gas estimate:", resetGas.toString());
        } catch (error) {
          console.log("❌ Reset allowance would fail:", error.message);
        }
      }

    } catch (error) {
      console.log("❌ Approval would fail:", error.message);
    }

    console.log("\n🔗 Contract Interaction Test:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    // Test if gateway contract is working
    try {
      const gatewayOwner = await gateway.owner();
      console.log("Gateway Owner:", gatewayOwner);
      
      const isPaused = await gateway.paused();
      console.log("Gateway Paused:", isPaused);

      // Check if user is registered as merchant
      try {
        const merchantInfo = await gateway.getMerchantInfo(signer.address);
        console.log("Merchant Info:", {
          businessName: merchantInfo[0],
          totalOrders: merchantInfo[1].toString(),
          totalVolume: ethers.formatUnits(merchantInfo[2], 6),
          pendingBalance: ethers.formatUnits(merchantInfo[3], 6),
          feeRate: merchantInfo[4].toString(),
          isActive: merchantInfo[5]
        });
      } catch (error) {
        console.log("❌ Not registered as merchant or error:", error.message);
      }

    } catch (error) {
      console.log("❌ Gateway contract error:", error.message);
    }

    console.log("\n💡 Recommendations:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    if (balance === 0n) {
      console.log("❌ You have no USDC balance. Get test tokens first:");
      console.log("   npx hardhat run scripts/get-test-tokens.js --network op-sepolia");
    } else if (allowance === 0n) {
      console.log("❌ You have no allowance. Approve tokens first:");
      console.log(`   await usdc.approve("${PAYMENT_GATEWAY_V2}", ethers.parseUnits("100", 6))`);
    } else if (allowance < ethers.parseUnits("1", tokenDecimals)) {
      console.log("⚠️  Low allowance. Consider approving more tokens:");
      console.log(`   await usdc.approve("${PAYMENT_GATEWAY_V2}", ethers.parseUnits("100", 6))`);
    } else {
      console.log("✅ Balance and allowance look good!");
      console.log("   The issue might be in the frontend state management or timing.");
    }

  } catch (error) {
    console.log("❌ Error during analysis:", error.message);
  }

  console.log("\n======================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
