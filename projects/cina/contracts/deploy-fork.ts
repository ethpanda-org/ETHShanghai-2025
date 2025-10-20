import { ethers } from "hardhat";
import { id, ZeroAddress } from "ethers";
import { Addresses, ChainlinkPriceFeed, encodeChainlinkPriceFeed, EthereumTokens } from "./src/utils/index";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying contracts with account:", deployerAddress);

  try {
    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.log("Could not fetch balance, but continuing deployment...");
  }

  // Deploy ProxyAdmin contracts
  console.log("\n=== Deploying ProxyAdmin ===");
  const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");

  // Use existing Fx ProxyAdmin
  const fxProxyAdmin = "0x9B54B7703551D9d0ced177A78367560a8B2eDDA4";
  console.log("Using existing Fx ProxyAdmin at:", fxProxyAdmin);

  // Deploy Custom ProxyAdmin (v4 - no constructor params needed)
  console.log("Deploying custom ProxyAdmin (will transfer ownership after)");
  const customProxyAdmin = await ProxyAdmin.deploy();
  await customProxyAdmin.waitForDeployment();
  const customProxyAdminAddress = await customProxyAdmin.getAddress();
  console.log("Custom ProxyAdmin deployed to:", customProxyAdminAddress);

  // Transfer ownership to deployer
  const transferOwnershipTx = await customProxyAdmin.transferOwnership(deployerAddress);
  await transferOwnershipTx.wait();
  console.log("Ownership transferred to:", deployerAddress);

  const customProxyAdminContract = customProxyAdmin;

  // Use existing EmptyContract
  const emptyContract = "0x387568e1ea4Ff4D003B8147739dB69D87325E206";
  console.log("Using existing EmptyContract at:", emptyContract);

  // Deploy TokenConverter (MultiPathConverter)
  console.log("\n=== Deploying TokenConverter ===");
  const MultiPathConverter = await ethers.getContractFactory("MultiPathConverter");
  const generalTokenConverter = "0x11C907b3aeDbD863e551c37f21DD3F36b28A6784";
  const multiPathConverter = await MultiPathConverter.deploy(generalTokenConverter);
  await multiPathConverter.waitForDeployment();
  console.log("MultiPathConverter deployed to:", await multiPathConverter.getAddress());

  // Deploy Proxies
  console.log("\n=== Deploying Proxies ===");
  const TransparentUpgradeableProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");

  const poolManagerProxy = await TransparentUpgradeableProxy.deploy(emptyContract, customProxyAdminAddress, "0x");
  await poolManagerProxy.waitForDeployment();
  console.log("PoolManagerProxy deployed to:", await poolManagerProxy.getAddress());

  const pegKeeperProxy = await TransparentUpgradeableProxy.deploy(emptyContract, customProxyAdminAddress, "0x");
  await pegKeeperProxy.waitForDeployment();
  console.log("PegKeeperProxy deployed to:", await pegKeeperProxy.getAddress());

  const fxUSDBasePoolProxy = await TransparentUpgradeableProxy.deploy(emptyContract, customProxyAdminAddress, "0x");
  await fxUSDBasePoolProxy.waitForDeployment();
  console.log("FxUSDBasePoolProxy deployed to:", await fxUSDBasePoolProxy.getAddress());

  // Use existing FxUSD Proxy
  const fxUSDProxy = "0x085780639CC2cACd35E474e71f4d000e2405d8f6";
  console.log("Using existing FxUSDProxy at:", fxUSDProxy);

  // Deploy ReservePool and RevenuePool
  console.log("\n=== Deploying ReservePool and RevenuePool ===");
  const treasury = "0x0084C2e1B1823564e597Ff4848a88D61ac63D703";

  const ReservePool = await ethers.getContractFactory("ReservePool");
  const reservePool = await ReservePool.deploy(deployerAddress, await poolManagerProxy.getAddress());
  await reservePool.waitForDeployment();
  console.log("ReservePool deployed to:", await reservePool.getAddress());

  const RevenuePool = await ethers.getContractFactory("RevenuePool");
  const revenuePool = await RevenuePool.deploy(treasury, treasury, deployerAddress);
  await revenuePool.waitForDeployment();
  console.log("RevenuePool deployed to:", await revenuePool.getAddress());

  // Deploy PoolManager Implementation
  console.log("\n=== Deploying PoolManager Implementation ===");
  const PoolManager = await ethers.getContractFactory("PoolManager");
  const poolManagerImpl = await PoolManager.deploy(
    fxUSDProxy,
    await fxUSDBasePoolProxy.getAddress(),
    await pegKeeperProxy.getAddress(),
    ZeroAddress, // PoolConfiguration
    ZeroAddress  // SmartWalletWhitelist
  );
  await poolManagerImpl.waitForDeployment();
  console.log("PoolManager Implementation deployed to:", await poolManagerImpl.getAddress());

  // Initialize PoolManager
  console.log("\n=== Initializing PoolManager ===");
  const poolManagerInitData = poolManagerImpl.interface.encodeFunctionData("initialize", [
    deployerAddress,
    0n,
    10000000n,    // HarvesterRatio
    100000n,      // FlashLoanFeeRatio
    treasury,
    await revenuePool.getAddress(),
    await reservePool.getAddress(),
  ]);

  const upgradeAndCallTx = await customProxyAdminContract.upgradeAndCall(
    await poolManagerProxy.getAddress(),
    await poolManagerImpl.getAddress(),
    poolManagerInitData
  );
  await upgradeAndCallTx.wait();
  console.log("PoolManager initialized");

  // Deploy FxUSDBasePool Implementation
  console.log("\n=== Deploying FxUSDBasePool Implementation ===");
  const FxUSDBasePool = await ethers.getContractFactory("FxUSDBasePool");
  const fxUSDBasePoolImpl = await FxUSDBasePool.deploy(
    await poolManagerProxy.getAddress(),
    await pegKeeperProxy.getAddress(),
    fxUSDProxy,
    EthereumTokens.USDC.address,
    encodeChainlinkPriceFeed(
      ChainlinkPriceFeed.ethereum["USDC-USD"].feed,
      ChainlinkPriceFeed.ethereum["USDC-USD"].scale,
      ChainlinkPriceFeed.ethereum["USDC-USD"].heartbeat
    )
  );
  await fxUSDBasePoolImpl.waitForDeployment();
  console.log("FxUSDBasePool Implementation deployed to:", await fxUSDBasePoolImpl.getAddress());

  // Initialize FxUSDBasePool
  console.log("\n=== Initializing FxUSDBasePool ===");
  const fxUSDBasePoolInitData = fxUSDBasePoolImpl.interface.encodeFunctionData("initialize", [
    deployerAddress,
    "fxUSD Save",
    "fxBASE",
    995000000000000000n, // StableDepegPrice
    1800n,               // RedeemCoolDownPeriod
  ]);

  const fxUSDBasePoolUpgradeTx = await customProxyAdminContract.upgradeAndCall(
    await fxUSDBasePoolProxy.getAddress(),
    await fxUSDBasePoolImpl.getAddress(),
    fxUSDBasePoolInitData
  );
  await fxUSDBasePoolUpgradeTx.wait();
  console.log("FxUSDBasePool initialized");

  // Deploy PegKeeper Implementation
  console.log("\n=== Deploying PegKeeper Implementation ===");
  const PegKeeper = await ethers.getContractFactory("PegKeeper");
  const pegKeeperImpl = await PegKeeper.deploy(await fxUSDBasePoolProxy.getAddress());
  await pegKeeperImpl.waitForDeployment();
  console.log("PegKeeper Implementation deployed to:", await pegKeeperImpl.getAddress());

  // Initialize PegKeeper
  console.log("\n=== Initializing PegKeeper ===");
  const pegKeeperInitData = pegKeeperImpl.interface.encodeFunctionData("initialize", [
    deployerAddress,
    await multiPathConverter.getAddress(),
    Addresses["CRV_SN_USDC/fxUSD_193"],
  ]);

  const pegKeeperUpgradeTx = await customProxyAdminContract.upgradeAndCall(
    await pegKeeperProxy.getAddress(),
    await pegKeeperImpl.getAddress(),
    pegKeeperInitData
  );
  await pegKeeperUpgradeTx.wait();
  console.log("PegKeeper initialized");

  // Deploy FxUSD Implementation
  console.log("\n=== Deploying FxUSD Implementation ===");
  const FxUSDRegeneracy = await ethers.getContractFactory("FxUSDRegeneracy");
  const fxUSDImpl = await FxUSDRegeneracy.deploy(
    await poolManagerProxy.getAddress(),
    EthereumTokens.USDC.address,
    await pegKeeperProxy.getAddress()
  );
  await fxUSDImpl.waitForDeployment();
  console.log("FxUSD Implementation deployed to:", await fxUSDImpl.getAddress());

  // Deploy FxUSDBasePool Gauge
  console.log("\n=== Deploying FxUSDBasePool Gauge ===");
  const liquidityGaugeImpl = "0xF62F458D2F6dd2AD074E715655064d7632e136D6";
  const LiquidityGauge = await ethers.getContractAt("ILiquidityGauge", liquidityGaugeImpl);

  const gaugeInitData = LiquidityGauge.interface.encodeFunctionData("initialize", [
    await fxUSDBasePoolProxy.getAddress(),
  ]);

  const fxProxyAdminContract = await ethers.getContractAt("ProxyAdmin", fxProxyAdmin);
  const fxUSDBasePoolGaugeProxy = await TransparentUpgradeableProxy.deploy(
    liquidityGaugeImpl,
    fxProxyAdmin,
    gaugeInitData
  );
  await fxUSDBasePoolGaugeProxy.waitForDeployment();
  console.log("FxUSDBasePool Gauge Proxy deployed to:", await fxUSDBasePoolGaugeProxy.getAddress());

  // Deploy GaugeRewarder
  console.log("\n=== Deploying GaugeRewarder ===");
  const GaugeRewarder = await ethers.getContractFactory("GaugeRewarder");
  const gaugeRewarder = await GaugeRewarder.deploy(await fxUSDBasePoolGaugeProxy.getAddress());
  await gaugeRewarder.waitForDeployment();
  console.log("GaugeRewarder deployed to:", await gaugeRewarder.getAddress());

  // Configure PoolManager parameters
  console.log("\n=== Configuring PoolManager Parameters ===");
  const poolManagerContract = await ethers.getContractAt("PoolManager", await poolManagerProxy.getAddress());

  const updateExpenseTx = await poolManagerContract.updateExpenseRatio(
    0n,          // RewardsExpenseRatio
    0n,          // FundingExpenseRatio
    100000000n   // LiquidationExpenseRatio
  );
  await updateExpenseTx.wait();
  console.log("Expense ratios updated");

  const updateRedeemFeeTx = await poolManagerContract.updateRedeemFeeRatio(5000000n);
  await updateRedeemFeeTx.wait();
  console.log("Redeem fee ratio updated");

  // Configure Gauge rewards
  console.log("\n=== Configuring Gauge Rewards ===");
  const gauge = await ethers.getContractAt("LinearMultipleRewardDistributor", await fxUSDBasePoolGaugeProxy.getAddress());

  const grantRoleTx = await gauge.grantRole(id("REWARD_MANAGER_ROLE"), deployerAddress);
  await grantRoleTx.wait();
  console.log("REWARD_MANAGER_ROLE granted");

  const registerWstETHTx = await gauge.registerRewardToken(EthereumTokens.wstETH.address, await gaugeRewarder.getAddress());
  await registerWstETHTx.wait();
  console.log("wstETH reward token registered");

  const registerFXNTx = await gauge.registerRewardToken(EthereumTokens.FXN.address, await gaugeRewarder.getAddress());
  await registerFXNTx.wait();
  console.log("FXN reward token registered");

  // Change proxy admin
  console.log("\n=== Changing Proxy Admin ===");
  const changePoolManagerAdminTx = await customProxyAdminContract.changeProxyAdmin(await poolManagerProxy.getAddress(), fxProxyAdmin);
  await changePoolManagerAdminTx.wait();
  console.log("PoolManager proxy admin changed");

  const changeFxUSDBasePoolAdminTx = await customProxyAdminContract.changeProxyAdmin(await fxUSDBasePoolProxy.getAddress(), fxProxyAdmin);
  await changeFxUSDBasePoolAdminTx.wait();
  console.log("FxUSDBasePool proxy admin changed");

  const changePegKeeperAdminTx = await customProxyAdminContract.changeProxyAdmin(await pegKeeperProxy.getAddress(), fxProxyAdmin);
  await changePegKeeperAdminTx.wait();
  console.log("PegKeeper proxy admin changed");

  console.log("\n=== Deployment Complete ===");
  console.log("\nDeployed Addresses:");
  console.log("--------------------");
  console.log("CustomProxyAdmin:", customProxyAdminAddress);
  console.log("MultiPathConverter:", await multiPathConverter.getAddress());
  console.log("PoolManagerProxy:", await poolManagerProxy.getAddress());
  console.log("PoolManagerImplementation:", await poolManagerImpl.getAddress());
  console.log("PegKeeperProxy:", await pegKeeperProxy.getAddress());
  console.log("PegKeeperImplementation:", await pegKeeperImpl.getAddress());
  console.log("FxUSDBasePoolProxy:", await fxUSDBasePoolProxy.getAddress());
  console.log("FxUSDBasePoolImplementation:", await fxUSDBasePoolImpl.getAddress());
  console.log("FxUSDImplementation:", await fxUSDImpl.getAddress());
  console.log("FxUSDBasePoolGaugeProxy:", await fxUSDBasePoolGaugeProxy.getAddress());
  console.log("ReservePool:", await reservePool.getAddress());
  console.log("RevenuePool:", await revenuePool.getAddress());
  console.log("GaugeRewarder:", await gaugeRewarder.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
