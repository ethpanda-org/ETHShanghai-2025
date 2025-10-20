import { ethers } from "hardhat";
import { parseEther, parseUnits, ZeroAddress } from "ethers";

async function main() {
  console.log("=== Complete Position Opening Test ===\n");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // Deployed contracts
  const poolManagerAddress = "0x66713e76897CdC363dF358C853df5eE5831c3E5a";
  const fxUSDAddress = "0x085780639CC2cACd35E474e71f4d000e2405d8f6";
  const reservePoolAddress = "0xc66DEdC010e09BAE8fa355b60f08a0fC8089DF2c";

  const poolManager = await ethers.getContractAt("PoolManager", poolManagerAddress);
  const fxUSD = await ethers.getContractAt("FxUSDRegeneracy", fxUSDAddress);

  console.log("=== Step 1: Deploy PoolConfiguration ===");

  // PoolConfiguration needs: fxUSDBasePool, aaveLendingPool, aaveBaseAsset
  const fxUSDBasePoolAddress = "0x6384D5F8999EaAC8bcCfae137D4e535075b47494"; // from our deployment
  const mockAaveLendingPool = ZeroAddress; // will deploy mock later
  const mockAaveBaseAsset = ZeroAddress; // USDC address, we'll use zero for now

  const PoolConfiguration = await ethers.getContractFactory("PoolConfiguration");
  const poolConfigImpl = await PoolConfiguration.deploy(
    fxUSDBasePoolAddress,
    mockAaveLendingPool,
    mockAaveBaseAsset
  );
  await poolConfigImpl.waitForDeployment();
  const poolConfigImplAddress = await poolConfigImpl.getAddress();
  console.log("PoolConfiguration Implementation:", poolConfigImplAddress);

  // Deploy proxy for PoolConfiguration (v4 - no constructor params)
  const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
  const configProxyAdmin = await ProxyAdmin.deploy();
  await configProxyAdmin.waitForDeployment();
  await configProxyAdmin.transferOwnership(deployerAddress);
  console.log("Config ProxyAdmin:", await configProxyAdmin.getAddress());

  const TransparentProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
  // Initialize with admin and oracle address
  const initData = poolConfigImpl.interface.encodeFunctionData("initialize", [
    deployerAddress,
    ZeroAddress // oracle, we'll set later
  ]);
  const poolConfigProxy = await TransparentProxy.deploy(
    poolConfigImplAddress,
    await configProxyAdmin.getAddress(),
    initData
  );
  await poolConfigProxy.waitForDeployment();
  const poolConfigAddress = await poolConfigProxy.getAddress();
  console.log("✅ PoolConfiguration Proxy:", poolConfigAddress);

  const poolConfig = await ethers.getContractAt("PoolConfiguration", poolConfigAddress);

  console.log("\n=== Step 2: Update PoolManager Configuration ===");

  try {
    // Get the PoolManager implementation to call updateConfig
    const PoolManagerImpl = await ethers.getContractFactory("PoolManager");
    const pmWithImpl = PoolManagerImpl.attach(poolManagerAddress);

    // Update configuration
    const updateConfigTx = await pmWithImpl.updateConfiguration(poolConfigAddress);
    await updateConfigTx.wait();
    console.log("✅ PoolManager configuration updated");
  } catch (e: any) {
    console.log("⚠️  Could not update configuration (might not have permission):", e.message);
    console.log("Continuing with mock setup...");
  }

  console.log("\n=== Step 3: Deploy Mock Long Pool ===");

  // For testing, we'll use a mock collateral token
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockWstETH = await MockERC20.deploy("Wrapped stETH", "wstETH", 18);
  await mockWstETH.waitForDeployment();
  const mockWstETHAddress = await mockWstETH.getAddress();
  console.log("Mock wstETH:", mockWstETHAddress);

  // Mint some wstETH to deployer
  await mockWstETH.mint(deployerAddress, parseEther("100"));
  console.log("✅ Minted 100 wstETH to deployer");

  // Deploy Mock Price Oracle
  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await MockPriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("Mock PriceOracle:", priceOracleAddress);

  // Set wstETH price to $3000
  await priceOracle.setPrice(parseEther("3000"));
  console.log("✅ Set wstETH price to $3000");

  // Deploy Mock Rate Provider (for wstETH)
  const MockRateProvider = await ethers.getContractFactory("MockRateProvider");
  const rateProvider = await MockRateProvider.deploy();
  await rateProvider.waitForDeployment();
  await rateProvider.setRate(parseEther("1.05")); // wstETH/stETH rate
  console.log("Mock RateProvider:", await rateProvider.getAddress());

  // Deploy AaveFundingPool
  const MockAavePool = await ethers.getContractFactory("MockAaveV3Pool");
  const mockAave = await MockAavePool.deploy();
  await mockAave.waitForDeployment();
  console.log("Mock Aave Pool:", await mockAave.getAddress());

  const AaveFundingPool = await ethers.getContractFactory("AaveFundingPool");
  const aaveFundingPoolImpl = await AaveFundingPool.deploy(
    poolManagerAddress,
    await mockAave.getAddress()
  );
  await aaveFundingPoolImpl.waitForDeployment();
  console.log("AaveFundingPool Implementation:", await aaveFundingPoolImpl.getAddress());

  // Deploy AaveFundingPool proxy
  const aaveInitData = aaveFundingPoolImpl.interface.encodeFunctionData("initialize", [
    deployerAddress,
    mockWstETHAddress, // collateral token
    "f(x) wstETH Position",
    "xstETH"
  ]);

  const aaveFundingProxy = await TransparentProxy.deploy(
    await aaveFundingPoolImpl.getAddress(),
    await configProxyAdmin.getAddress(),
    aaveInitData
  );
  await aaveFundingProxy.waitForDeployment();
  const aavePoolAddress = await aaveFundingProxy.getAddress();
  console.log("✅ AaveFundingPool Proxy:", aavePoolAddress);

  const aavePool = await ethers.getContractAt("AaveFundingPool", aavePoolAddress);

  console.log("\n=== Step 4: Register and Configure Pool ===");

  try {
    // Register pool
    console.log("Attempting to register pool...");
    const registerTx = await poolManager.registerPool(
      aavePoolAddress,
      ZeroAddress, // no reward splitter for now
      0, 0 // no capacity limits for testing
    );
    await registerTx.wait();
    console.log("✅ Pool registered");
  } catch (e: any) {
    console.log("⚠️  Could not register pool:", e.message);
    console.log("This is expected if we don't have owner permissions");
  }

  try {
    // Update token rate
    console.log("Setting up token rate...");
    await poolManager.updateTokenRate(
      mockWstETHAddress,
      await rateProvider.getAddress()
    );
    console.log("✅ Token rate configured");
  } catch (e: any) {
    console.log("⚠️  Could not set token rate:", e.message);
  }

  // Configure pool in PoolConfiguration (if we can)
  try {
    console.log("Configuring pool parameters...");

    // Register pool in configuration
    await poolConfig.registerPool(
      aavePoolAddress,
      priceOracleAddress,
      mockWstETHAddress
    );
    console.log("✅ Pool registered in configuration");

    // Set fee ratios (all 0 for testing)
    await poolConfig.updatePoolFeeRatio(
      aavePoolAddress,
      ZeroAddress,
      0, 0, 0, 0 // supply, withdraw, borrow, repay fees = 0
    );
    console.log("✅ Fee ratios configured");

  } catch (e: any) {
    console.log("⚠️  Could not configure pool:", e.message);
  }

  console.log("\n=== Step 5: Prepare for Position Opening ===");

  const collateralAmount = parseEther("1"); // 1 wstETH
  const borrowAmount = parseEther("2000"); // 2000 fxUSD

  console.log("Position parameters:");
  console.log("  Collateral:", ethers.formatEther(collateralAmount), "wstETH");
  console.log("  Borrow:", ethers.formatEther(borrowAmount), "fxUSD");
  console.log("  LTV:", (2000 / 3000 * 100).toFixed(2) + "%");

  // Check deployer's wstETH balance
  const wstETHBalance = await mockWstETH.balanceOf(deployerAddress);
  console.log("\nDeployer wstETH balance:", ethers.formatEther(wstETHBalance));

  if (wstETHBalance < collateralAmount) {
    console.log("❌ Insufficient wstETH balance");
    return;
  }

  // Approve PoolManager
  console.log("\n=== Step 6: Approve Collateral ===");
  const approveTx = await mockWstETH.approve(poolManagerAddress, collateralAmount);
  await approveTx.wait();
  console.log("✅ Approved", ethers.formatEther(collateralAmount), "wstETH");

  console.log("\n=== Step 7: Open Position ===");

  try {
    // Try to estimate gas first
    console.log("Estimating gas...");
    const gasEstimate = await poolManager.operate.estimateGas(
      aavePoolAddress,
      0, // new position
      collateralAmount,
      borrowAmount
    );
    console.log("Estimated gas:", gasEstimate.toString());

    // Execute the transaction
    console.log("\nOpening position...");
    const tx = await poolManager.operate(
      aavePoolAddress,
      0, // positionId = 0 for new position
      collateralAmount,
      borrowAmount,
      {
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
      }
    );

    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("\n🎉 SUCCESS! Position opened!");
    console.log("Gas used:", receipt!.gasUsed.toString());
    console.log("Block number:", receipt!.blockNumber);

    // Parse events
    console.log("\n=== Events ===");
    for (const log of receipt!.logs) {
      try {
        const parsed = poolManager.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        if (parsed) {
          console.log(`Event: ${parsed.name}`);
          console.log("Args:", parsed.args);
        }
      } catch (e) {
        // Skip unparseable logs
      }
    }

    // Check results
    console.log("\n=== Position Opened Successfully ===");

    const fxUSDBalance = await fxUSD.balanceOf(deployerAddress);
    console.log("Deployer fxUSD balance:", ethers.formatEther(fxUSDBalance));

    const wstETHBalanceAfter = await mockWstETH.balanceOf(deployerAddress);
    console.log("Deployer wstETH balance:", ethers.formatEther(wstETHBalanceAfter));

    console.log("\n✅ Position #1 created!");
    console.log("  - Collateral deposited: 1 wstETH");
    console.log("  - fxUSD borrowed:", ethers.formatEther(fxUSDBalance));

  } catch (error: any) {
    console.log("\n❌ Failed to open position");
    console.log("Error:", error.message);

    if (error.data) {
      try {
        const decodedError = poolManager.interface.parseError(error.data);
        console.log("Decoded error:", decodedError);
      } catch (e) {
        console.log("Raw error data:", error.data);
      }
    }

    console.log("\nPossible reasons:");
    console.log("1. Pool not properly registered");
    console.log("2. PoolManager paused");
    console.log("3. Insufficient collateral ratio");
    console.log("4. Price oracle not configured");
    console.log("5. Pool configuration missing");

    // Try to get more details
    try {
      const config = await poolManager.configuration();
      console.log("\nPoolManager configuration address:", config);
      if (config === ZeroAddress) {
        console.log("⚠️  Configuration is not set!");
      }
    } catch (e) {
      console.log("Could not check configuration");
    }
  }

  console.log("\n=== Test Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
