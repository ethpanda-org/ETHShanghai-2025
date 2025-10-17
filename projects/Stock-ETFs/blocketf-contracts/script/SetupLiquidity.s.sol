// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {stdJson} from "forge-std/StdJson.sol";

// Price Oracle interface
interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

// MockERC20 interface for minting
interface IMockERC20 {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

// PancakeSwap V3 interfaces
interface IPancakeV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IPancakeV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint32 feeProtocol,
            bool unlocked
        );
}

interface IPancakeV3NonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

    function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96)
        external
        payable
        returns (address pool);
}

/**
 * @title SetupLiquidity
 * @notice Script to setup liquidity pools on PancakeSwap V3 for all token pairs
 * @dev Run after deploying mock tokens to enable trading
 *
 * Strategy (Updated - All V3 pools):
 * - V3: All token/USDT pairs including WBNB (WBNB V3 liquidity now matches V2)
 * - Prices are fetched from MockPriceOracle for consistency
 * - Each pool has 5M USDT liquidity for deep liquidity
 */
contract SetupLiquidity is Script {
    using stdJson for string;

    // PancakeSwap addresses on BNB Testnet
    address constant PANCAKE_V3_FACTORY = 0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865;
    address constant PANCAKE_V3_POSITION_MANAGER = 0x427bF5b37357632377eCbEC9de3626C71A5396c1;

    // Token addresses (loaded from deployed-contracts.json)
    address public wbnbToken;
    address public btcToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;
    address public usdtToken;

    // Price Oracle address (loaded from deployed-contracts.json)
    address public priceOracle;

    // V3 pools: 5M USDT per pool for deep liquidity
    uint256 constant LIQUIDITY_USDT_PER_POOL = 5_000_000e18; // 5M USDT

    // V3 fee tiers (basis points)
    uint24 constant FEE_LOWEST = 100; // 0.01% - for stablecoin pairs
    uint24 constant FEE_LOW = 500; // 0.05% - for stable pairs or high volume
    uint24 constant FEE_MEDIUM = 2500; // 0.25% - standard for most pairs
    uint24 constant FEE_HIGH = 10000; // 1% - for exotic or low volume pairs

    // Fee tier mapping for each token (based on mainnet liquidity data)
    mapping(address => uint24) public tokenFees;

    function setUp() public {
        // Load token addresses from deployed-contracts.json
        loadContractsFromJson();

        // Configure fee tiers for each token based on mainnet liquidity patterns
        // Higher volume pairs typically use lower fees
        tokenFees[wbnbToken] = FEE_LOWEST; // 0.01% - WBNB has highest volume on BSC
        tokenFees[btcToken] = FEE_LOW; // 0.05% - BTC is major asset
        tokenFees[ethToken] = FEE_LOW; // 0.05% - ETH is major asset
        tokenFees[adaToken] = FEE_MEDIUM; // 0.25% - ADA standard tier
        tokenFees[bchToken] = FEE_MEDIUM; // 0.25% - BCH standard tier
    }

    /**
     * @notice Load contract addresses from deployed-contracts.json
     */
    function loadContractsFromJson() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        // Load token addresses
        wbnbToken = json.readAddress(".contracts.mockTokens[0].contractAddress");
        btcToken = json.readAddress(".contracts.mockTokens[1].contractAddress");
        ethToken = json.readAddress(".contracts.mockTokens[2].contractAddress");
        adaToken = json.readAddress(".contracts.mockTokens[3].contractAddress");
        bchToken = json.readAddress(".contracts.mockTokens[4].contractAddress");
        usdtToken = json.readAddress(".contracts.mockTokens[5].contractAddress");

        // Load PriceOracle address
        priceOracle = json.readAddress(".contracts.priceOracle.contractAddress");

        console2.log("Loaded contracts from deployed-contracts.json:");
        console2.log("  WBNB:", wbnbToken);
        console2.log("  BTCB:", btcToken);
        console2.log("  ETH:", ethToken);
        console2.log("  ADA:", adaToken);
        console2.log("  BCH:", bchToken);
        console2.log("  USDT:", usdtToken);
        console2.log("  PriceOracle:", priceOracle);
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Setting up V3 Liquidity Pools (All Pairs)");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Price Oracle:", priceOracle);
        console2.log("USDT per pool:", LIQUIDITY_USDT_PER_POOL / 1e18, "USDT");
        console2.log("\nAvailable Fee Tiers:");
        console2.log("  0.01% (100) - Stablecoin pairs");
        console2.log("  0.05% (500) - High volume pairs");
        console2.log("  0.25% (2500) - Standard pairs");
        console2.log("  1.00% (10000) - Low volume pairs");
        console2.log("\nConfigured Fee Tiers:");
        console2.log("  WBNB: 0.01% (100) - Highest volume");
        console2.log("  BTC/ETH: 0.05% (500) - Major assets");
        console2.log("  ADA/BCH: 0.25% (2500) - Standard");

        vm.startBroadcast(deployerPrivateKey);

        // Pre-mint large amounts of all tokens to avoid balance issues
        console2.log("\nPre-minting tokens...");
        uint256 LARGE_AMOUNT = 100_000_000 * 1e18; // 100 million tokens
        IMockERC20(wbnbToken).mint(deployer, LARGE_AMOUNT);
        IMockERC20(btcToken).mint(deployer, LARGE_AMOUNT);
        IMockERC20(ethToken).mint(deployer, LARGE_AMOUNT);
        IMockERC20(adaToken).mint(deployer, LARGE_AMOUNT);
        IMockERC20(bchToken).mint(deployer, LARGE_AMOUNT);
        IMockERC20(usdtToken).mint(deployer, LARGE_AMOUNT);
        console2.log("  Minted 100M tokens for each asset");

        // Setup V3 pools for all token/USDT pairs
        console2.log("\nSetting up V3 Pools with oracle prices...");

        // Get prices from oracle and setup pools
        setupV3PoolWithOracle(wbnbToken, "WBNB");
        setupV3PoolWithOracle(btcToken, "BTCB");
        setupV3PoolWithOracle(ethToken, "ETH");
        setupV3PoolWithOracle(adaToken, "ADA");
        setupV3PoolWithOracle(bchToken, "BCH");

        vm.stopBroadcast();

        console2.log("\n========================================");
        console2.log("Liquidity Setup Complete!");
        console2.log("========================================");
        console2.log("\nPools Created:");
        console2.log("  V3: WBNB/USDT, BTC/USDT, ETH/USDT, ADA/USDT, BCH/USDT");
        console2.log("\nTotal: 5 V3 liquidity pools");
        console2.log("Each pool: 5M USDT + corresponding token amount based on oracle price");
        console2.log("\nNext Steps:");
        console2.log("1. Verify pools on PancakeSwap testnet");
        console2.log("2. Configure Router and Rebalancer to use V3 pools");
        console2.log("3. Test swaps through ETFRouterV1");
        console2.log("4. Test minting ETF shares with USDT");
    }

    /**
     * @notice Setup V3 pool with price from oracle
     * @param token Token address
     * @param symbol Token symbol for logging
     */
    function setupV3PoolWithOracle(address token, string memory symbol) internal {
        // Get price from oracle
        uint256 tokenPrice = IPriceOracle(priceOracle).getPrice(token);

        // Get fee tier for this token
        uint24 fee = tokenFees[token];

        console2.log("\n  Setting up", symbol, "/USDT pool");
        console2.log("    Token:", token);
        console2.log("    Price from oracle:", tokenPrice / 1e18, "USD");
        console2.log("    Fee tier:", fee, _getFeeDescription(fee));

        // Setup V3 pool with oracle price and configured fee
        setupV3Pool(token, usdtToken, fee, LIQUIDITY_USDT_PER_POOL, tokenPrice);
    }

    /**
     * @notice Get fee description for logging
     */
    function _getFeeDescription(uint24 fee) internal pure returns (string memory) {
        if (fee == 100) return "(0.01%)";
        if (fee == 500) return "(0.05%)";
        if (fee == 2500) return "(0.25%)";
        if (fee == 10000) return "(1%)";
        return "(custom)";
    }

    /**
     * @notice Ensure deployer has sufficient token balance, mint if needed
     * @param token Token address
     * @param required Required amount
     */
    function ensureSufficientBalance(address token, uint256 required) internal {
        IMockERC20 mockToken = IMockERC20(token);
        uint256 balance = mockToken.balanceOf(msg.sender);

        console2.log("    Checking balance for token:", token);
        console2.log("      Current balance:", balance / 1e18);
        console2.log("      Required amount:", required / 1e18);

        if (balance < required) {
            uint256 toMint = required - balance;
            console2.log("      Insufficient! Minting:", toMint / 1e18);

            // Mint additional tokens
            mockToken.mint(msg.sender, toMint);

            // Verify new balance
            uint256 newBalance = mockToken.balanceOf(msg.sender);
            console2.log("      New balance:", newBalance / 1e18);

            require(newBalance >= required, "Failed to mint sufficient tokens");
        } else {
            console2.log("      Balance sufficient!");
        }
    }

    /**
     * @notice Setup V3 liquidity pool
     * @param token Token address (not USDT)
     * @param usdt USDT address
     * @param fee Pool fee tier (500, 2500, or 10000)
     * @param usdtAmount Amount of USDT to provide
     * @param tokenPrice Price of token in USD (18 decimals)
     */
    function setupV3Pool(address token, address usdt, uint24 fee, uint256 usdtAmount, uint256 tokenPrice) internal {
        // Determine token0 and token1 (must be sorted)
        (address token0, address token1) = token < usdt ? (token, usdt) : (usdt, token);

        // Check if pool already exists
        IPancakeV3Factory factory = IPancakeV3Factory(PANCAKE_V3_FACTORY);
        address existingPool = factory.getPool(token0, token1, fee);

        if (existingPool != address(0)) {
            console2.log("    Pool already exists at:", existingPool);
            console2.log("    Skipping pool creation");
            return;
        }

        IPancakeV3NonfungiblePositionManager positionManager =
            IPancakeV3NonfungiblePositionManager(PANCAKE_V3_POSITION_MANAGER);

        // Calculate token amount based on price
        uint256 tokenAmount = (usdtAmount * 1e18) / tokenPrice;

        console2.log("    Required token amount:", tokenAmount / 1e18);
        console2.log("    Required USDT amount:", usdtAmount / 1e18);

        // Note: Tokens were pre-minted in large amounts at the start of the script
        // V3 full-range positions may need more tokens depending on current tick
        // So we approve a very large amount to be safe
        uint256 APPROVAL_AMOUNT = 50_000_000 * 1e18; // 50M tokens

        (uint256 amount0, uint256 amount1) = token < usdt ? (tokenAmount, usdtAmount) : (usdtAmount, tokenAmount);

        // Approve large amounts to handle V3 full-range position requirements
        IERC20(token0).approve(PANCAKE_V3_POSITION_MANAGER, APPROVAL_AMOUNT);
        IERC20(token1).approve(PANCAKE_V3_POSITION_MANAGER, APPROVAL_AMOUNT);

        // Calculate sqrtPriceX96 for pool initialization
        uint160 sqrtPriceX96 = calculateSqrtPriceX96(token0, token1, tokenPrice);

        // Create and initialize pool if necessary
        address pool = positionManager.createAndInitializePoolIfNecessary(token0, token1, fee, sqrtPriceX96);

        console2.log("    Pool created at:", pool);

        // Provide full range liquidity
        // For fee tier 100 (0.01%), tick spacing is 1
        // For fee tier 500 (0.05%), tick spacing is 10
        // For fee tier 2500 (0.25%), tick spacing is 50
        // For fee tier 10000 (1%), tick spacing is 200
        int24 tickSpacing;
        if (fee == 100) tickSpacing = 1;
        else if (fee == 500) tickSpacing = 10;
        else if (fee == 2500) tickSpacing = 50;
        else if (fee == 10000) tickSpacing = 200;
        else revert("Unsupported fee tier");

        // Use full range ticks that are multiples of tick spacing
        int24 tickLower = -887200 / tickSpacing * tickSpacing; // Round down to nearest multiple
        int24 tickUpper = 887200 / tickSpacing * tickSpacing; // Round down to nearest multiple

        // Use large desired amounts since we have plenty of pre-minted tokens
        uint256 DESIRED_AMOUNT = 50_000_000 * 1e18; // 50M tokens

        IPancakeV3NonfungiblePositionManager.MintParams memory params = IPancakeV3NonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: DESIRED_AMOUNT, // Use large amount to handle V3 full-range requirements
            amount1Desired: DESIRED_AMOUNT, // Use large amount to handle V3 full-range requirements
            amount0Min: 0, // Allow any amount (full range position ratio depends on current price)
            amount1Min: 0, // Allow any amount (full range position ratio depends on current price)
            recipient: msg.sender,
            deadline: block.timestamp + 1 hours
        });

        (uint256 tokenId, uint128 liquidity,,) = positionManager.mint(params);

        console2.log("  V3 Pool created:");
        console2.log("    Pool:", pool);
        console2.log("    Position ID:", tokenId);
        console2.log("    Liquidity:", uint256(liquidity));
    }

    /**
     * @notice Calculate sqrtPriceX96 for V3 pool initialization
     * @dev Calculates based on real token prices to match mainnet conditions
     *
     * V3 Price Formula:
     * - price = (amount1/amount0) = (reserve1/reserve0)
     * - sqrtPriceX96 = sqrt(price) * 2^96
     *
     * Example: BTC/USDT pool
     * - If BTC = $95,000 and USDT = $1
     * - When BTC is token0 and USDT is token1:
     *   price = USDT/BTC = 1/95000 = 0.00001052...
     * - When USDT is token0 and BTC is token1:
     *   price = BTC/USDT = 95000/1 = 95000
     *
     * @param token0 First token (lower address), determines price direction
     * @param tokenPrice Price of the non-USDT token in USD (18 decimals)
     */
    function calculateSqrtPriceX96(address token0, address token1, uint256 tokenPrice)
        internal
        view
        returns (uint160)
    {
        // tokenPrice is the price of the non-USDT token in USD (18 decimals)
        // e.g., BTC = 95000e18, ETH = 3400e18, WBNB = 1311e18

        // Determine which token is USDT
        bool token0IsUSDT = token0 == usdtToken;
        bool token1IsUSDT = token1 == usdtToken;

        require(token0IsUSDT || token1IsUSDT, "One token must be USDT");

        // V3 price formula: price = amount1/amount0 (in terms of token1 per token0)
        // sqrtPriceX96 = sqrt(price) * 2^96

        // Both tokens have 18 decimals, so we need:
        // price = (amount1 * 1e18) / (amount0 * 1e18) = amount1/amount0

        uint256 sqrtPriceX96;

        if (token0IsUSDT) {
            // token0 = USDT ($1), token1 = asset (tokenPrice)
            // price = asset/USDT = tokenPrice/1 = tokenPrice (already in 1e18)
            // sqrtPrice = sqrt(tokenPrice)
            // sqrtPriceX96 = sqrt(tokenPrice) * 2^96 / 1e9 (scale down to avoid overflow)

            uint256 sqrtPrice = sqrt(tokenPrice); // sqrt of e18 value = e9 value
            sqrtPriceX96 = (sqrtPrice * (1 << 96)) / 1e9;
        } else {
            // token0 = asset (tokenPrice), token1 = USDT ($1)
            // price = USDT/asset = 1/tokenPrice (in 1e18 terms)
            // We need: sqrtPrice = sqrt(1e18 / tokenPrice)
            //        = sqrt(1e36 / tokenPrice) / 1e9

            uint256 numerator = 1e36; // 1e18 * 1e18 for precision
            uint256 priceInverted = numerator / tokenPrice;
            uint256 sqrtPrice = sqrt(priceInverted); // sqrt of e18 value = e9 value
            sqrtPriceX96 = (sqrtPrice * (1 << 96)) / 1e9;
        }

        require(sqrtPriceX96 > 0, "Invalid price");
        require(sqrtPriceX96 <= type(uint160).max, "Price overflow");

        return uint160(sqrtPriceX96);
    }

    /**
     * @notice Calculate square root using Babylonian method
     * @dev More accurate than simple approximation
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        else if (x <= 3) return 1;

        uint256 z = (x + 1) / 2;
        y = x;

        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
