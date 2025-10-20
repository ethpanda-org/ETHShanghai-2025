// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {BlockETFCore} from "../src/BlockETFCore.sol";
import {ETFRouterV1} from "../src/ETFRouterV1.sol";
import {ETFRebalancerV1} from "../src/ETFRebalancerV1.sol";

/**
 * @title VerifyDeployment
 * @notice Verify all deployed contracts are configured correctly
 * @dev Usage: forge script script/VerifyDeployment.s.sol --rpc-url bnb_testnet
 */
contract VerifyDeployment is Script {
    // Deployed contract addresses (with correct checksums)
    address constant ETF_CORE = 0x862aDe3291CA93ed9cAC581a96A03B9F82Aaf84f;
    address constant REBALANCER = 0xC7f5Be24d0aCd658bCC728aF3619bFb5FA6BA049;
    address constant ROUTER = 0x0926839eA33f3d776Ce2C184E52DF330561BEdA2;
    address constant QUOTER_V3 = 0x6a12F38238fC16e809F1eaBbe8E893812cC627f7;

    function run() public view {
        console2.log("========================================");
        console2.log("Verifying Deployed Contracts");
        console2.log("========================================");
        console2.log("");

        // Verify ETF Core
        console2.log("1. BlockETFCore Verification");
        console2.log("   Address:", ETF_CORE);
        BlockETFCore etfCore = BlockETFCore(ETF_CORE);

        string memory name = etfCore.name();
        string memory symbol = etfCore.symbol();
        address rebalancerAddr = etfCore.rebalancer();
        address priceOracle = address(etfCore.priceOracle());
        bool initialized = etfCore.initialized();

        console2.log("   Name:", name);
        console2.log("   Symbol:", symbol);
        console2.log("   Rebalancer:", rebalancerAddr);
        console2.log("   PriceOracle:", priceOracle);
        console2.log("   Initialized:", initialized);

        if (rebalancerAddr == REBALANCER) {
            console2.log("   Status: OK - Rebalancer configured correctly");
        } else {
            console2.log("   Status: ERROR - Rebalancer mismatch!");
        }
        console2.log("");

        // Verify Rebalancer
        console2.log("2. ETFRebalancerV1 Verification");
        console2.log("   Address:", REBALANCER);
        ETFRebalancerV1 rebalancer = ETFRebalancerV1(REBALANCER);

        address etfCoreAddr = address(rebalancer.etfCore());
        address v3Router = address(rebalancer.v3Router());
        address v2Router = address(rebalancer.v2Router());
        address usdt = rebalancer.USDT();
        address wbnb = rebalancer.WBNB();

        console2.log("   ETF Core:", etfCoreAddr);
        console2.log("   V3 Router:", v3Router);
        console2.log("   V2 Router:", v2Router);
        console2.log("   USDT:", usdt);
        console2.log("   WBNB:", wbnb);

        if (etfCoreAddr == ETF_CORE) {
            console2.log("   Status: OK - ETF Core linked correctly");
        } else {
            console2.log("   Status: ERROR - ETF Core mismatch!");
        }
        console2.log("");

        // Verify Router
        console2.log("3. ETFRouterV1 Verification");
        console2.log("   Address:", ROUTER);
        ETFRouterV1 router = ETFRouterV1(ROUTER);

        address routerEtfCore = address(router.etfCore());
        address routerV3Router = address(router.v3Router());
        address routerPriceOracle = address(router.priceOracle());
        address routerQuoter = address(router.quoterV3());

        console2.log("   ETF Core:", routerEtfCore);
        console2.log("   V3 Router:", routerV3Router);
        console2.log("   PriceOracle:", routerPriceOracle);
        console2.log("   QuoterV3:", routerQuoter);

        if (routerEtfCore == ETF_CORE && routerQuoter == QUOTER_V3) {
            console2.log("   Status: OK - Router configured correctly");
        } else {
            console2.log("   Status: ERROR - Configuration mismatch!");
        }
        console2.log("");

        // Summary
        console2.log("========================================");
        console2.log("Verification Summary");
        console2.log("========================================");

        bool allOk = (rebalancerAddr == REBALANCER) && (etfCoreAddr == ETF_CORE) && (routerEtfCore == ETF_CORE)
            && (routerQuoter == QUOTER_V3);

        if (allOk) {
            console2.log("Status: ALL CHECKS PASSED");
            console2.log("");
            console2.log("All contracts are deployed and configured correctly!");
        } else {
            console2.log("Status: ERRORS DETECTED");
            console2.log("");
            console2.log("Please review the errors above and redeploy if necessary.");
        }
        console2.log("");
    }
}
