// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

interface INonfungiblePositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
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

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function collect(CollectParams calldata params) external payable returns (uint256 amount0, uint256 amount1);

    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title DecreaseLiquidity
 * @notice Script to decrease liquidity from V3 positions
 * @dev Decreases liquidity by a specified percentage (e.g., 99% to leave 1%)
 *
 * Usage: forge script script/DecreaseLiquidity.s.sol --rpc-url bnb_testnet --broadcast
 */
contract DecreaseLiquidity is Script {
    address constant PANCAKE_V3_POSITION_MANAGER = 0x427bF5b37357632377eCbEC9de3626C71A5396c1;

    // Position token IDs (from SetupLiquidity broadcast)
    uint256[] public tokenIds = [24607, 24608, 24609, 24610, 24611];

    // Decrease percentage (99 = decrease 99% of liquidity, leaving 1%)
    uint256 constant DECREASE_PERCENTAGE = 99;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Decreasing Liquidity");
        console2.log("========================================");
        console2.log("Deployer (will receive tokens):", deployer);
        console2.log("Decrease percentage:", DECREASE_PERCENTAGE, "%");
        console2.log("");

        INonfungiblePositionManager positionManager = INonfungiblePositionManager(PANCAKE_V3_POSITION_MANAGER);

        // First, check all positions
        console2.log("Current positions:");
        address actualOwner;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];

            try positionManager.ownerOf(tokenId) returns (address owner) {
                if (i == 0) {
                    actualOwner = owner;
                    console2.log("Position owner:", owner);
                }

                console2.log("\nPosition", tokenId);

                (,, address token0, address token1, uint24 fee,,, uint128 liquidity,,,,) =
                    positionManager.positions(tokenId);

                console2.log("  Token0:", token0);
                console2.log("  Token1:", token1);
                console2.log("  Fee:", fee);
                console2.log("  Current liquidity:", liquidity);

                // Calculate liquidity to remove
                uint128 liquidityToRemove = uint128((uint256(liquidity) * DECREASE_PERCENTAGE) / 100);
                console2.log("  Liquidity to remove:", liquidityToRemove);
                console2.log("  Remaining liquidity:", uint256(liquidity) - uint256(liquidityToRemove));
            } catch {
                console2.log("\nPosition", tokenId, "- Not found or error");
            }
        }

        console2.log("\n========================================");
        console2.log("Starting liquidity decrease...");
        console2.log("========================================\n");

        // NOTE: We need to broadcast with the actual owner's private key
        // But in this case, the positions are owned by msg.sender during broadcast
        // So we use startBroadcast which will set msg.sender correctly
        vm.startBroadcast(deployerPrivateKey);

        uint256 successCount = 0;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];

            try positionManager.ownerOf(tokenId) returns (address owner) {
                // During broadcast, msg.sender will be the owner
                console2.log("Processing position", tokenId);

                (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(tokenId);

                if (liquidity == 0) {
                    console2.log("Skipping position", tokenId, "(no liquidity)");
                    continue;
                }

                // Calculate liquidity to remove
                uint128 liquidityToRemove = uint128((uint256(liquidity) * DECREASE_PERCENTAGE) / 100);

                console2.log("Decreasing liquidity for position", tokenId);

                // Decrease liquidity
                INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager
                    .DecreaseLiquidityParams({
                    tokenId: tokenId,
                    liquidity: liquidityToRemove,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp + 1 hours
                });

                try positionManager.decreaseLiquidity(params) returns (uint256 amount0, uint256 amount1) {
                    console2.log("  Decreased! Removed tokens:");
                    console2.log("    Amount0:", amount0);
                    console2.log("    Amount1:", amount1);

                    // Collect the tokens
                    INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager
                        .CollectParams({
                        tokenId: tokenId,
                        recipient: msg.sender, // Send to the caller (broadcast sender)
                        amount0Max: type(uint128).max,
                        amount1Max: type(uint128).max
                    });

                    (uint256 collected0, uint256 collected1) = positionManager.collect(collectParams);
                    console2.log("  Collected:");
                    console2.log("    Token0:", collected0);
                    console2.log("    Token1:", collected1);

                    successCount++;
                } catch Error(string memory reason) {
                    console2.log("  Failed to decrease:", reason);
                } catch {
                    console2.log("  Failed to decrease: unknown error");
                }
            } catch {
                console2.log("Skipping position", tokenId, "(not found)");
            }
        }

        vm.stopBroadcast();

        console2.log("\n========================================");
        console2.log("Decrease Complete");
        console2.log("========================================");
        console2.log("Positions decreased:", successCount, "/", tokenIds.length);
    }
}
