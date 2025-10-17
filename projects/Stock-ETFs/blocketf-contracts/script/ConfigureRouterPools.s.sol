// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";

interface IETFRouterV1 {
    function setAssetV3PoolsBatch(
        address[] calldata assets,
        address[] calldata pools
    ) external;

    function getAssetV3Pool(
        address asset
    ) external view returns (address pool, uint24 fee);
}

/**
 * @title ConfigureRouterPools
 * @notice Script to configure V3 pool addresses in ETFRouterV1
 * @dev Reads token and pool addresses from deployed-contracts.json
 */
contract ConfigureRouterPools is Script {
    using stdJson for string;

    // Contract addresses (loaded from JSON)
    address public router;
    address public wbnbToken;
    address public btcToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;

    // Pool addresses (loaded from JSON)
    address public wbnbPool;
    address public btcbPool;
    address public ethPool;
    address public adaPool;
    address public bchPool;

    function setUp() public {
        loadContractsFromJson();
    }

    function loadContractsFromJson() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        // Load router address
        router = json.readAddress(".contracts.router.contractAddress");

        // Load token addresses
        wbnbToken = json.readAddress(
            ".contracts.mockTokens[0].contractAddress"
        );
        btcToken = json.readAddress(".contracts.mockTokens[1].contractAddress");
        ethToken = json.readAddress(".contracts.mockTokens[2].contractAddress");
        adaToken = json.readAddress(".contracts.mockTokens[3].contractAddress");
        bchToken = json.readAddress(".contracts.mockTokens[4].contractAddress");

        // Load pool addresses
        wbnbPool = json.readAddress(".contracts.v3Pools[0].contractAddress");
        btcbPool = json.readAddress(".contracts.v3Pools[1].contractAddress");
        ethPool = json.readAddress(".contracts.v3Pools[2].contractAddress");
        adaPool = json.readAddress(".contracts.v3Pools[3].contractAddress");
        bchPool = json.readAddress(".contracts.v3Pools[4].contractAddress");

        console2.log("Loaded contracts from deployed-contracts.json");
        console2.log("  Router:", router);
        console2.log("");
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Configuring Router V3 Pools");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Router:", router);
        console2.log("");

        // Prepare arrays
        address[] memory assets = new address[](5);
        assets[0] = wbnbToken;
        assets[1] = btcToken;
        assets[2] = ethToken;
        assets[3] = adaToken;
        assets[4] = bchToken;

        address[] memory pools = new address[](5);
        pools[0] = wbnbPool;
        pools[1] = btcbPool;
        pools[2] = ethPool;
        pools[3] = adaPool;
        pools[4] = bchPool;

        // Display configuration
        console2.log("Assets and Pools to Configure:");
        console2.log("------------------------------------------------------------");
        for (uint256 i = 0; i < assets.length; i++) {
            console2.log("  Asset:", assets[i]);
            console2.log("  Pool: ", pools[i]);
            console2.log("");
        }

        // Execute configuration
        vm.startBroadcast(deployerPrivateKey);

        IETFRouterV1(router).setAssetV3PoolsBatch(assets, pools);

        vm.stopBroadcast();

        console2.log("========================================");
        console2.log("Configuration Complete");
        console2.log("========================================");
        console2.log("");

        // Verify configuration
        console2.log("Verifying Configuration:");
        console2.log("------------------------------------------------------------");

        string[5] memory symbols = ["WBNB", "BTCB", "ETH", "ADA", "BCH"];

        for (uint256 i = 0; i < assets.length; i++) {
            (address configuredPool, uint24 fee) = IETFRouterV1(router)
                .getAssetV3Pool(assets[i]);

            console2.log(symbols[i], "Pool:");
            console2.log("  Configured:", configuredPool);
            console2.log("  Fee:", fee);
            console2.log(
                "  Status:",
                configuredPool == pools[i] ? "OK" : "MISMATCH"
            );
            console2.log("");
        }
    }
}
