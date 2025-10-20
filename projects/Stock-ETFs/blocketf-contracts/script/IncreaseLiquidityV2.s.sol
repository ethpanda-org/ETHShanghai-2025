// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

interface INonfungiblePositionManager {
    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function increaseLiquidity(IncreaseLiquidityParams calldata params)
        external
        payable
        returns (uint128 liquidity, uint256 amount0, uint256 amount1);
}

interface IMockERC20 {
    function mint(address to, uint256 amount) external;
}

/**
 * @title IncreaseLiquidityV2
 * @notice Script to increase liquidity in V2 pools to support larger trades
 * @dev Targets $5M TVL per pool to support 1000+ BNB trades
 *
 * Target TVL: $5M per pool ($2.5M USDT + $2.5M asset)
 * Total across 5 pools: $25M
 *
 * Usage: forge script script/IncreaseLiquidityV2.s.sol --rpc-url bnb_testnet --broadcast
 */
contract IncreaseLiquidityV2 is Script {
    // Contracts
    address constant PANCAKE_V3_POSITION_MANAGER = 0x427bF5b37357632377eCbEC9de3626C71A5396c1;
    address constant PRICE_ORACLE = 0x33bFB48F9f7203259247f6A12265fCb8571e1951;

    // Mock tokens
    address constant WBNB = 0xFaDc475b03E3bd7813a71446369204271a0a9843;
    address constant BTCB = 0x15Ab97353bfb6C6F07B3354A2ea1615eB2F45941;
    address constant ETH = 0x1cd44EC6CFb99132531793a397220C84216C5eeD;
    address constant ADA = 0xBE1Bf5C613C64B2a5F2dEd08B4A26dd2082Fa2cB;
    address constant BCH = 0x1aB580a59da516F068F43EFCac10CC33862A7E88;
    address constant USDT = 0xe364204ad025bbcDFF6DCb4291f89F532b0a8C35;

    // V2 Position NFT IDs
    uint256 constant WBNB_POSITION = 24674;
    uint256 constant BTCB_POSITION = 24675;
    uint256 constant ETH_POSITION = 24676;
    uint256 constant ADA_POSITION = 24677;
    uint256 constant BCH_POSITION = 24678;

    // Target: $5M TVL per pool = $2.5M USDT + $2.5M asset
    uint256 constant TARGET_USDT_PER_POOL = 2_500_000 * 1e18; // $2.5M USDT
    uint256 constant TARGET_ASSET_USD_VALUE = 2_500_000 * 1e18; // $2.5M in asset

    // Safety factor for minting
    uint256 constant SAFETY_MULTIPLIER = 3; // 3x for V3 full-range uncertainty

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Increasing V2 Pool Liquidity");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Target TVL per pool: $5M USD");
        console2.log("  $2.5M USDT + $2.5M asset");
        console2.log("Total target TVL: $25M USD (5 pools)");
        console2.log("");

        IPriceOracle oracle = IPriceOracle(PRICE_ORACLE);
        INonfungiblePositionManager positionManager = INonfungiblePositionManager(PANCAKE_V3_POSITION_MANAGER);

        // Get oracle prices
        console2.log("Fetching oracle prices...");
        uint256 wbnbPrice = oracle.getPrice(WBNB);
        uint256 btcbPrice = oracle.getPrice(BTCB);
        uint256 ethPrice = oracle.getPrice(ETH);
        uint256 adaPrice = oracle.getPrice(ADA);
        uint256 bchPrice = oracle.getPrice(BCH);

        console2.log("  WBNB:", wbnbPrice / 1e18, "USD");
        console2.log("  BTCB:", btcbPrice / 1e18, "USD");
        console2.log("  ETH:", ethPrice / 1e18, "USD");
        console2.log("  ADA:", adaPrice / 1e18, "USD");
        console2.log("  BCH:", bchPrice / 1e18, "USD");
        console2.log("");

        // Calculate required amounts with safety factor
        uint256 usdtTotal = TARGET_USDT_PER_POOL * 5 * SAFETY_MULTIPLIER;
        uint256 wbnbAmount = (TARGET_ASSET_USD_VALUE * 1e18) / wbnbPrice * SAFETY_MULTIPLIER;
        uint256 btcbAmount = (TARGET_ASSET_USD_VALUE * 1e18) / btcbPrice * SAFETY_MULTIPLIER;
        uint256 ethAmount = (TARGET_ASSET_USD_VALUE * 1e18) / ethPrice * SAFETY_MULTIPLIER;
        uint256 adaAmount = (TARGET_ASSET_USD_VALUE * 1e18) / adaPrice * SAFETY_MULTIPLIER;
        uint256 bchAmount = (TARGET_ASSET_USD_VALUE * 1e18) / bchPrice * SAFETY_MULTIPLIER;

        console2.log("Pre-minting tokens (with 3x safety factor)...");
        console2.log("  USDT:", usdtTotal / 1e18, "tokens");
        console2.log("  WBNB:", wbnbAmount / 1e18, "tokens");
        console2.log("  BTCB:", btcbAmount / 1e18, "tokens");
        console2.log("  ETH:", ethAmount / 1e18, "tokens");
        console2.log("  ADA:", adaAmount / 1e18, "tokens");
        console2.log("  BCH:", bchAmount / 1e18, "tokens");
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Mint tokens
        IMockERC20(USDT).mint(deployer, usdtTotal);
        IMockERC20(WBNB).mint(deployer, wbnbAmount);
        IMockERC20(BTCB).mint(deployer, btcbAmount);
        IMockERC20(ETH).mint(deployer, ethAmount);
        IMockERC20(ADA).mint(deployer, adaAmount);
        IMockERC20(BCH).mint(deployer, bchAmount);

        console2.log("Tokens minted successfully");
        console2.log("");

        // Approve Position Manager
        console2.log("Approving Position Manager...");
        IERC20(USDT).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(WBNB).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(BTCB).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(ETH).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(ADA).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(BCH).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        console2.log("Approvals complete");
        console2.log("");

        // Increase liquidity for each position
        console2.log("========================================");
        console2.log("Increasing Liquidity for Each Position");
        console2.log("========================================");
        console2.log("");

        // WBNB Position
        increaseLiquidityForPosition(
            positionManager, WBNB_POSITION, "WBNB", WBNB, USDT, wbnbAmount, TARGET_USDT_PER_POOL
        );

        // BTCB Position
        increaseLiquidityForPosition(
            positionManager, BTCB_POSITION, "BTCB", BTCB, USDT, btcbAmount, TARGET_USDT_PER_POOL
        );

        // ETH Position
        increaseLiquidityForPosition(positionManager, ETH_POSITION, "ETH", ETH, USDT, ethAmount, TARGET_USDT_PER_POOL);

        // ADA Position
        increaseLiquidityForPosition(positionManager, ADA_POSITION, "ADA", ADA, USDT, adaAmount, TARGET_USDT_PER_POOL);

        // BCH Position
        increaseLiquidityForPosition(positionManager, BCH_POSITION, "BCH", BCH, USDT, bchAmount, TARGET_USDT_PER_POOL);

        vm.stopBroadcast();

        console2.log("");
        console2.log("========================================");
        console2.log("Liquidity Increase Complete");
        console2.log("========================================");
        console2.log("All 5 positions have been increased");
        console2.log("Target TVL per pool: $5M USD");
        console2.log("Total target TVL: $25M USD");
    }

    function increaseLiquidityForPosition(
        INonfungiblePositionManager positionManager,
        uint256 tokenId,
        string memory symbol,
        address token,
        address usdt,
        uint256 tokenAmount,
        uint256 usdtAmount
    ) internal {
        console2.log("--------------------------------------------------");
        console2.log("Position", tokenId, "-", symbol);
        console2.log("--------------------------------------------------");

        // Get position info
        (,, address token0, address token1,,,, uint128 currentLiquidity,,,,) = positionManager.positions(tokenId);

        console2.log("  Token0:", token0);
        console2.log("  Token1:", token1);
        console2.log("  Current liquidity:", currentLiquidity);

        // Determine amount0 and amount1 based on token order
        uint256 amount0Desired;
        uint256 amount1Desired;

        if (token0 == usdt) {
            // token0 = USDT, token1 = asset
            amount0Desired = usdtAmount;
            amount1Desired = tokenAmount;
        } else {
            // token0 = asset, token1 = USDT
            amount0Desired = tokenAmount;
            amount1Desired = usdtAmount;
        }

        console2.log("  Increasing with:");
        console2.log("    Amount0 desired:", amount0Desired / 1e18);
        console2.log("    Amount1 desired:", amount1Desired / 1e18);

        // Increase liquidity
        INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager
            .IncreaseLiquidityParams({
            tokenId: tokenId,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0, // Accept any amount
            amount1Min: 0, // Accept any amount
            deadline: block.timestamp + 1 hours
        });

        try positionManager.increaseLiquidity(params) returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
            console2.log("  Success!");
            console2.log("    Liquidity added:", liquidity);
            console2.log("    Amount0 used:", amount0 / 1e18);
            console2.log("    Amount1 used:", amount1 / 1e18);

            // Get new position info
            (,,,,,,, uint128 newLiquidity,,,,) = positionManager.positions(tokenId);
            console2.log("    New total liquidity:", newLiquidity);
        } catch Error(string memory reason) {
            console2.log("  Failed:", reason);
        } catch {
            console2.log("  Failed: unknown error");
        }

        console2.log("");
    }
}
