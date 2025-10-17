// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

/**
 * @title VerifyContracts
 * @notice Helper script to verify contracts on BscScan
 * @dev This generates the verification commands - run them manually or via script
 */
contract VerifyContracts is Script {
    function run() public view {
        // Read deployed addresses from environment or hardcode after deployment
        address etfCore = vm.envOr("BLOCK_ETF_CORE", address(0));
        address rebalancer = vm.envOr("ETF_REBALANCER_V1", address(0));
        address router = vm.envOr("ETF_ROUTER_V1", address(0));
        address oracle = vm.envOr("PRICE_ORACLE", address(0));

        console2.log("========================================");
        console2.log("Contract Verification Commands");
        console2.log("========================================");
        console2.log("");

        if (etfCore != address(0)) {
            console2.log("1. Verify BlockETFCore:");
            console2.log("forge verify-contract \\");
            console2.log("  --chain-id 97 \\");
            console2.log("  --watch \\");
            console2.log("  --etherscan-api-key $BSCSCAN_API_KEY \\");
            console2.log("  --verifier-url https://api-testnet.bscscan.com/api \\");
            console2.log("  ", vm.toString(etfCore), "\\");
            console2.log("  src/BlockETFCore.sol:BlockETFCore");
            console2.log("");
        }

        if (oracle != address(0)) {
            console2.log("2. Verify PriceOracle:");
            console2.log("forge verify-contract \\");
            console2.log("  --chain-id 97 \\");
            console2.log("  --watch \\");
            console2.log("  --etherscan-api-key $BSCSCAN_API_KEY \\");
            console2.log("  --verifier-url https://api-testnet.bscscan.com/api \\");
            console2.log("  ", vm.toString(oracle), "\\");
            console2.log("  src/PriceOracle.sol:PriceOracle");
            console2.log("");
        }

        if (rebalancer != address(0)) {
            console2.log("3. Verify ETFRebalancerV1:");
            console2.log("forge verify-contract \\");
            console2.log("  --chain-id 97 \\");
            console2.log("  --watch \\");
            console2.log("  --etherscan-api-key $BSCSCAN_API_KEY \\");
            console2.log("  --verifier-url https://api-testnet.bscscan.com/api \\");
            console2.log(
                "  --constructor-args $(cast abi-encode \"constructor(address,address,address,address)\" <ETF_CORE> <ORACLE> <V3_ROUTER> <V2_ROUTER>) \\"
            );
            console2.log("  ", vm.toString(rebalancer), "\\");
            console2.log("  src/ETFRebalancerV1.sol:ETFRebalancerV1");
            console2.log("");
        }

        if (router != address(0)) {
            console2.log("4. Verify ETFRouterV1:");
            console2.log("forge verify-contract \\");
            console2.log("  --chain-id 97 \\");
            console2.log("  --watch \\");
            console2.log("  --etherscan-api-key $BSCSCAN_API_KEY \\");
            console2.log("  --verifier-url https://api-testnet.bscscan.com/api \\");
            console2.log(
                "  --constructor-args $(cast abi-encode \"constructor(address,address,address,address,address)\" <ETF_CORE> <ORACLE> <USDT> <V3_ROUTER> <V2_ROUTER>) \\"
            );
            console2.log("  ", vm.toString(router), "\\");
            console2.log("  src/ETFRouterV1.sol:ETFRouterV1");
            console2.log("");
        }

        console2.log("========================================");
        console2.log("Note: Replace <PLACEHOLDER> values with actual addresses");
        console2.log("========================================");
    }
}
