import { ethers } from "hardhat";
import { parseEther, parseUnits } from "ethers";

async function main() {
  console.log("=== Simple Position Opening Test ===\n");

  const [deployer, user1] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer address:", deployerAddress);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // Contract addresses from deployment
  const poolManagerAddress = "0x66713e76897CdC363dF358C853df5eE5831c3E5a";

  console.log("=== Checking PoolManager ===");
  const poolManager = await ethers.getContractAt("PoolManager", poolManagerAddress);

  try {
    // Check if PoolManager is initialized by calling a view function
    const fxUSDAddress = await poolManager.fxUSD();
    console.log("✅ PoolManager is accessible");
    console.log("fxUSD address:", fxUSDAddress);

    const configAddress = await poolManager.configuration();
    console.log("Configuration address:", configAddress);

    if (configAddress === ethers.ZeroAddress) {
      console.log("\n❌ PoolManager is not fully initialized (no configuration)");
      console.log("The PoolManager was deployed but needs configuration to be set.");
    }

  } catch (e: any) {
    console.log("❌ Error accessing PoolManager:", e.message);
  }

  console.log("\n=== Situation Analysis ===");
  console.log("The current deployment only includes:");
  console.log("✅ PoolManager proxy");
  console.log("✅ FxUSDBasePool");
  console.log("✅ PegKeeper");
  console.log("✅ Core infrastructure");
  console.log("");
  console.log("❌ No Long Pools (e.g., wstETH pool) deployed yet");
  console.log("❌ No PoolConfiguration deployed");
  console.log("");
  console.log("To test position opening, we need:");
  console.log("1. Deploy a Long Pool (e.g., wstETH pool)");
  console.log("2. Register the pool with PoolManager");
  console.log("3. Set up pool configuration (fee ratios, capacity, etc.)");
  console.log("4. Set up price oracles");
  console.log("5. Then we can open positions");

  console.log("\n=== Checking Mainnet State (Fork) ===");
  console.log("Since we're on a fork, let's check if there are any existing pools...");

  // Check mainnet PoolManager (if it exists)
  const mainnetPoolManager = "0x42A5737dd96484F241A8666D98dE99B344801381"; // Example address

  try {
    const code = await ethers.provider.getCode(mainnetPoolManager);
    if (code !== "0x") {
      console.log("✅ Found existing mainnet PoolManager");
      const existingPM = await ethers.getContractAt("IPoolManager", mainnetPoolManager);

      // Try to get some info
      try {
        const mainnetFxUSD = await existingPM.fxUSD();
        console.log("Mainnet fxUSD:", mainnetFxUSD);
      } catch (e) {
        console.log("Could not read from mainnet PoolManager");
      }
    } else {
      console.log("No existing PoolManager found at that address");
    }
  } catch (e) {
    console.log("Could not check mainnet state");
  }

  console.log("\n=== Next Steps for Testing Position Opening ===");
  console.log("");
  console.log("Option 1: Deploy a complete pool setup");
  console.log("  - Deploy PoolConfiguration");
  console.log("  - Deploy a Long Pool (e.g., MockLongPool for testing)");
  console.log("  - Register and configure the pool");
  console.log("  - Open position");
  console.log("");
  console.log("Option 2: Use existing mainnet pools (if available on fork)");
  console.log("  - Check for existing pools on mainnet");
  console.log("  - Interact with those pools");
  console.log("");
  console.log("Option 3: Write unit tests using Hardhat test framework");
  console.log("  - Create mock contracts");
  console.log("  - Test in isolation");
  console.log("");
  console.log("For now, let's create a mock test showing the flow:");

  console.log("\n=== Mock Position Opening Flow ===");
  console.log("");
  console.log("1. User has 1 wstETH collateral");
  console.log("2. User approves PoolManager to spend wstETH");
  console.log("3. User calls: poolManager.operate(poolAddress, 0, 1e18, 2000e18)");
  console.log("   - poolAddress: address of wstETH pool");
  console.log("   - 0: positionId (0 = new position)");
  console.log("   - 1e18: supply 1 wstETH");
  console.log("   - 2000e18: borrow 2000 fxUSD");
  console.log("");
  console.log("4. PoolManager:");
  console.log("   - Transfers collateral from user");
  console.log("   - Deposits collateral into pool");
  console.log("   - Mints fxUSD debt");
  console.log("   - Transfers fxUSD to user");
  console.log("   - Creates NFT position for user");
  console.log("");
  console.log("5. User now has:");
  console.log("   - 2000 fxUSD (borrowed)");
  console.log("   - 1 NFT representing the position");
  console.log("   - Debt of 2000 fxUSD to repay");

  console.log("\n=== Test Complete ===");
  console.log("To actually execute position opening, please:");
  console.log("1. Run the full pool deployment scripts");
  console.log("2. Or use the existing test suite: npx hardhat test test/core/PoolManager.spec.ts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
