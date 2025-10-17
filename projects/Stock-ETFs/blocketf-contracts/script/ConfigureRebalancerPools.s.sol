// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";

interface IETFRebalancerV1 {
    function configureAssetPools(
        address[] calldata assets,
        address[] calldata pools,
        uint24[] calldata fees
    ) external;

    function assetPools(address asset) external view returns (address pool);
    function poolFees(address pool) external view returns (uint24 fee);
}

/**
 * @title ConfigureRebalancerPools
 * @notice Script to configure V3 pool addresses in ETFRebalancerV1
 * @dev Reads token and pool addresses from deployed-contracts.json
 */
contract ConfigureRebalancerPools is Script {
    using stdJson for string;

    // Contract addresses (loaded from JSON)
    address public rebalancer;
    address public wbnbToken;
    address public btcToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;

    // Pool addresses and fees (loaded from JSON)
    address public wbnbPool;
    address public btcbPool;
    address public ethPool;
    address public adaPool;
    address public bchPool;

    uint24 public wbnbFee;
    uint24 public btcbFee;
    uint24 public ethFee;
    uint24 public adaFee;
    uint24 public bchFee;

    function setUp() public {
        loadContractsFromJson();
    }

    function loadContractsFromJson() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        // Load rebalancer address
        rebalancer = json.readAddress(".contracts.rebalancer.contractAddress");

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

        // Load fee tiers (need to parse as uint)
        wbnbFee = uint24(json.readUint(".contracts.v3Pools[0].fee"));
        btcbFee = uint24(json.readUint(".contracts.v3Pools[1].fee"));
        ethFee = uint24(json.readUint(".contracts.v3Pools[2].fee"));
        adaFee = uint24(json.readUint(".contracts.v3Pools[3].fee"));
        bchFee = uint24(json.readUint(".contracts.v3Pools[4].fee"));

        console2.log("Loaded contracts from deployed-contracts.json");
        console2.log("  Rebalancer:", rebalancer);
        console2.log("");
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Configuring Rebalancer V3 Pools");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Rebalancer:", rebalancer);
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

        uint24[] memory fees = new uint24[](5);
        fees[0] = wbnbFee;
        fees[1] = btcbFee;
        fees[2] = ethFee;
        fees[3] = adaFee;
        fees[4] = bchFee;

        // Display configuration
        console2.log("Assets, Pools, and Fees to Configure:");
        console2.log(
            "------------------------------------------------------------"
        );
        string[5] memory symbols = ["WBNB", "BTCB", "ETH", "ADA", "BCH"];

        for (uint256 i = 0; i < assets.length; i++) {
            console2.log(symbols[i], ":");
            console2.log("  Asset:", assets[i]);
            console2.log("  Pool: ", pools[i]);
            console2.log("  Fee:  ", fees[i]);
            console2.log("");
        }

        // Execute configuration
        vm.startBroadcast(deployerPrivateKey);

        IETFRebalancerV1(rebalancer).configureAssetPools(assets, pools, fees);

        vm.stopBroadcast();

        console2.log("========================================");
        console2.log("Configuration Complete");
        console2.log("========================================");
        console2.log("");

        // Verify configuration
        console2.log("Verifying Configuration:");
        console2.log(
            "------------------------------------------------------------"
        );

        for (uint256 i = 0; i < assets.length; i++) {
            address configuredPool = IETFRebalancerV1(rebalancer).assetPools(
                assets[i]
            );
            uint24 configuredFee = IETFRebalancerV1(rebalancer).poolFees(
                pools[i]
            );

            console2.log(symbols[i], ":");
            console2.log("  Configured Pool:", configuredPool);
            console2.log("  Configured Fee: ", configuredFee);
            console2.log(
                "  Pool Status:",
                configuredPool == pools[i] ? "OK" : "MISMATCH"
            );
            console2.log(
                "  Fee Status: ",
                configuredFee == fees[i] ? "OK" : "MISMATCH"
            );
            console2.log("");
        }
    }
}
