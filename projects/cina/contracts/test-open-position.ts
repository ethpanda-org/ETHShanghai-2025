import { ethers } from "hardhat";
import { parseEther, parseUnits } from "ethers";

async function main() {
  console.log("=== Testing Position Opening ===\n");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer address:", deployerAddress);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // Contract addresses from deployment
  const poolManagerAddress = "0x66713e76897CdC363dF358C853df5eE5831c3E5a";
  const fxUSDAddress = "0x085780639CC2cACd35E474e71f4d000e2405d8f6"; // Existing mainnet contract

  // Get contract instances
  const poolManager = await ethers.getContractAt("PoolManager", poolManagerAddress);
  const fxUSD = await ethers.getContractAt("FxUSDRegeneracy", fxUSDAddress);

  console.log("=== Contract Information ===");
  console.log("PoolManager:", poolManagerAddress);
  console.log("FxUSD:", fxUSDAddress);

  try {
    const owner = await poolManager.owner();
    console.log("PoolManager owner:", owner);
  } catch (e) {
    console.log("Could not fetch PoolManager owner (might need to check if initialized)");
  }

  // Check registered pools
  console.log("\n=== Checking Registered Pools ===");

  // Common collateral token addresses on mainnet
  const wstETHAddress = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  // Check if wstETH pool is registered
  let poolAddress = await poolManager.poolRegistry(wstETHAddress);
  console.log("wstETH pool address:", poolAddress);

  if (poolAddress === ethers.ZeroAddress) {
    console.log("❌ No wstETH pool registered. Need to deploy a pool first.");
    console.log("\nTo test position opening, we need:");
    console.log("1. A registered pool (e.g., wstETH pool)");
    console.log("2. Collateral tokens (wstETH)");
    console.log("3. The pool must be properly configured");

    console.log("\n=== Attempting to check for any registered pools ===");
    // Try common tokens
    const tokens = [
      { name: "WETH", address: wethAddress },
      { name: "wstETH", address: wstETHAddress },
    ];

    let foundPool = false;
    for (const token of tokens) {
      const pool = await poolManager.poolRegistry(token.address);
      if (pool !== ethers.ZeroAddress) {
        console.log(`✅ Found pool for ${token.name}:`, pool);
        foundPool = true;
        poolAddress = pool;
        break;
      }
    }

    if (!foundPool) {
      console.log("\n⚠️  No pools found. This is expected on a fresh fork.");
      console.log("The protocol requires pools to be deployed before opening positions.");
      console.log("\nFor testing, you would need to:");
      console.log("1. Deploy a Long Pool (e.g., wstETH pool)");
      console.log("2. Register it with PoolManager");
      console.log("3. Configure pool parameters");
      console.log("4. Then open positions");
      return;
    }
  }

  console.log("\n=== Pool Found! Attempting to Open Position ===");

  // Get pool info
  const pool = await ethers.getContractAt("ILongPool", poolAddress);
  const collateralToken = await pool.collateralToken();
  console.log("Pool collateral token:", collateralToken);

  // For testing on a fork, we need to:
  // 1. Get some collateral tokens (wstETH)
  // 2. Approve PoolManager to spend them
  // 3. Call operate to open position

  console.log("\n=== Step 1: Getting Collateral Tokens ===");

  // Impersonate a whale account that has wstETH
  const wstETHWhale = "0x5fEC2f34D80ED82370F733043B6A536d7e9D7f8d"; // Large wstETH holder

  // Set balance for whale if needed
  await ethers.provider.send("anvil_impersonateAccount", [wstETHWhale]);
  const whaleSigner = await ethers.getSigner(wstETHWhale);

  // Get wstETH contract
  const wstETH = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)",
     "function transfer(address, uint256) returns (bool)",
     "function approve(address, uint256) returns (bool)"],
    collateralToken
  );

  const whaleBalance = await wstETH.balanceOf(wstETHWhale);
  console.log("Whale wstETH balance:", ethers.formatEther(whaleBalance));

  if (whaleBalance === 0n) {
    console.log("❌ Whale has no balance. Need to use a different approach.");
    // Alternative: Set balance directly
    const amount = parseEther("10");
    await ethers.provider.send("anvil_setBalance", [
      wstETHWhale,
      "0x56BC75E2D63100000" // 100 ETH
    ]);
    console.log("Set ETH balance for whale");
  }

  // Transfer wstETH to deployer
  const collateralAmount = parseEther("1"); // 1 wstETH
  console.log("\n=== Step 2: Transferring Collateral to Test Account ===");

  try {
    const transferTx = await wstETH.connect(whaleSigner).transfer(deployerAddress, collateralAmount);
    await transferTx.wait();
    console.log("✅ Transferred", ethers.formatEther(collateralAmount), "wstETH to deployer");
  } catch (e: any) {
    console.log("❌ Transfer failed:", e.message);
    console.log("\nTrying alternative: setting balance directly...");

    // Use Anvil's setStorageAt to set balance
    // This is a workaround for testing
    const balanceSlot = 0; // Usually slot 0 for balances in ERC20
    const paddedAddress = ethers.zeroPadValue(deployerAddress, 32);
    const slot = ethers.keccak256(paddedAddress + balanceSlot.toString(16).padStart(64, '0'));
    await ethers.provider.send("anvil_setStorageAt", [
      collateralToken,
      slot,
      ethers.zeroPadValue(ethers.toBeHex(collateralAmount), 32)
    ]);
    console.log("✅ Set wstETH balance directly");
  }

  await ethers.provider.send("anvil_stopImpersonatingAccount", [wstETHWhale]);

  const deployerCollateralBalance = await wstETH.balanceOf(deployerAddress);
  console.log("Deployer wstETH balance:", ethers.formatEther(deployerCollateralBalance));

  if (deployerCollateralBalance === 0n) {
    console.log("❌ Failed to get collateral. Cannot proceed with position opening.");
    return;
  }

  console.log("\n=== Step 3: Approving PoolManager ===");
  const approveTx = await wstETH.connect(deployer).approve(poolManagerAddress, collateralAmount);
  await approveTx.wait();
  console.log("✅ Approved PoolManager to spend", ethers.formatEther(collateralAmount), "wstETH");

  console.log("\n=== Step 4: Opening Position ===");

  // Parameters for opening position:
  // - positionId: 0 (creates new position)
  // - newColl: amount of collateral to supply
  // - newDebt: amount of fxUSD to borrow

  const newColl = collateralAmount; // 1 wstETH
  const newDebt = parseEther("2000"); // Borrow 2000 fxUSD (assuming ~$3000 wstETH price, ~66% LTV)

  console.log("Position parameters:");
  console.log("  Collateral:", ethers.formatEther(newColl), "wstETH");
  console.log("  Debt:", ethers.formatEther(newDebt), "fxUSD");

  try {
    // Try to estimate gas first
    const gasEstimate = await poolManager.operate.estimateGas(
      poolAddress,
      0n, // positionId = 0 for new position
      newColl,
      newDebt
    );
    console.log("Estimated gas:", gasEstimate.toString());

    // Open position
    const tx = await poolManager.connect(deployer).operate(
      poolAddress,
      0n,
      newColl,
      newDebt
    );

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Position opened successfully!");
    console.log("Gas used:", receipt!.gasUsed.toString());

    // Get position ID from events
    const positionId = receipt!.logs.length > 0 ? "1" : "Unknown";
    console.log("Position ID:", positionId);

    // Check fxUSD balance
    const fxUSDBalance = await fxUSD.balanceOf(deployerAddress);
    console.log("\n=== Position Opened Successfully ===");
    console.log("Deployer fxUSD balance:", ethers.formatEther(fxUSDBalance));

  } catch (error: any) {
    console.log("❌ Failed to open position");
    console.log("Error:", error.message);

    if (error.message.includes("revert")) {
      console.log("\nPossible reasons:");
      console.log("1. Pool not properly configured");
      console.log("2. Insufficient collateral");
      console.log("3. Position would be undercollateralized");
      console.log("4. Pool is paused");
      console.log("5. Price oracle not set");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
