const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔍 CHECKING: Finding Correct Token Addresses");
  console.log("======================================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("💼 Deployer:", deployer.address);

  // Known contracts
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";

  // Get the gateway contract
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  console.log("📊 Checking Recent Orders to Find Token Addresses");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Check some recent orders to see what tokens are being used
  const testOrderIds = [
    "APB9RMUXL",
    "TEST_PUBLIC_1760230985025",
    "TEST_1760226899547"
  ];

  let foundTokens = new Set();

  for (const orderId of testOrderIds) {
    try {
      const orderDetails = await gateway.getOrderDetailsByString(orderId);
      const paymentToken = orderDetails[4];
      const settlementToken = orderDetails[5];

      console.log(`Order: ${orderId}`);
      console.log(`  Payment Token: ${paymentToken}`);
      console.log(`  Settlement Token: ${settlementToken}`);
      console.log("");

      foundTokens.add(paymentToken);
      foundTokens.add(settlementToken);
    } catch (error) {
      console.log(`  Order ${orderId} not found or error`);
    }
  }

  console.log("\n📋 Found Token Addresses:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const tokens = Array.from(foundTokens);

  // Check each found token
  const ERC20_ABI = [
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)"
  ];

  for (const tokenAddr of tokens) {
    if (tokenAddr === "0x0000000000000000000000000000000000000000") continue;

    try {
      const token = new ethers.Contract(tokenAddr, ERC20_ABI, deployer);
      const symbol = await token.symbol();
      const name = await token.name();
      const decimals = await token.decimals();
      const totalSupply = await token.totalSupply();

      console.log(`Token: ${tokenAddr}`);
      console.log(`  Symbol: ${symbol}`);
      console.log(`  Name: ${name}`);
      console.log(`  Decimals: ${decimals}`);
      console.log(`  Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)}`);
      console.log("");

      // Save for later
      if (symbol === "USDT" || name.includes("USDT")) {
        console.log(`  ✅ Found USDT contract: ${tokenAddr}`);
      }
    } catch (error) {
      console.log(`  Error reading token ${tokenAddr}: ${error.message}`);
    }
  }

  console.log("\n📊 Checking FXRouter Configuration");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const FX_ROUTER = "0xC2ab12Baf3735864528F890B809Ffe2f1cf2f8d1";

  // Try to get the FXRouter owner
  const FX_ROUTER_ABI = [
    "function owner() view returns (address)",
    "function getExchangeRate(address tokenIn, address tokenOut) view returns (uint256)"
  ];

  try {
    const fxRouter = new ethers.Contract(FX_ROUTER, FX_ROUTER_ABI, deployer);
    const owner = await fxRouter.owner();
    console.log(`FXRouter Owner: ${owner}`);
    console.log(`Is deployer the owner? ${owner.toLowerCase() === deployer.address.toLowerCase() ? "✅ YES" : "❌ NO"}`);
  } catch (error) {
    console.log(`Error checking FXRouter: ${error.message}`);
  }

  console.log("\n======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });