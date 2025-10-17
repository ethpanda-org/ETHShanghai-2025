// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";

interface IMockERC20 {
    function mint(address to, uint256 amount) external;
}

/**
 * @title MintTokensForSync
 * @notice Mint tokens to deployer for price synchronization swaps
 * @dev Usage: forge script script/MintTokensForSync.s.sol --rpc-url bnb_testnet --broadcast
 */
contract MintTokensForSync is Script {
    using stdJson for string;

    // Mint amounts (enough for multiple sync operations)
    uint256 constant WBNB_AMOUNT = 100 * 1e18;      // 100 WBNB
    uint256 constant BTCB_AMOUNT = 1 * 1e18;        // 1 BTCB
    uint256 constant ETH_AMOUNT = 10 * 1e18;        // 10 ETH
    uint256 constant ADA_AMOUNT = 100000 * 1e18;    // 100,000 ADA
    uint256 constant BCH_AMOUNT = 100 * 1e18;       // 100 BCH
    uint256 constant USDT_AMOUNT = 1000000 * 1e18;  // 1M USDT

    // Token addresses (loaded from deployed-contracts.json)
    address public wbnbToken;
    address public btcToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;
    address public usdtToken;

    function setUp() public {
        loadContractsFromJson();
    }

    function loadContractsFromJson() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        wbnbToken = json.readAddress(".contracts.mockTokens[0].contractAddress");
        btcToken = json.readAddress(".contracts.mockTokens[1].contractAddress");
        ethToken = json.readAddress(".contracts.mockTokens[2].contractAddress");
        adaToken = json.readAddress(".contracts.mockTokens[3].contractAddress");
        bchToken = json.readAddress(".contracts.mockTokens[4].contractAddress");
        usdtToken = json.readAddress(".contracts.mockTokens[5].contractAddress");
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Minting Tokens for Price Sync");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("");

        console2.log("Mint amounts:");
        console2.log("  WBNB:", WBNB_AMOUNT / 1e18);
        console2.log("  BTCB:", BTCB_AMOUNT / 1e18);
        console2.log("  ETH:", ETH_AMOUNT / 1e18);
        console2.log("  ADA:", ADA_AMOUNT / 1e18);
        console2.log("  BCH:", BCH_AMOUNT / 1e18);
        console2.log("  USDT:", USDT_AMOUNT / 1e18);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Mint tokens
        IMockERC20(wbnbToken).mint(deployer, WBNB_AMOUNT);
        IMockERC20(btcToken).mint(deployer, BTCB_AMOUNT);
        IMockERC20(ethToken).mint(deployer, ETH_AMOUNT);
        IMockERC20(adaToken).mint(deployer, ADA_AMOUNT);
        IMockERC20(bchToken).mint(deployer, BCH_AMOUNT);
        IMockERC20(usdtToken).mint(deployer, USDT_AMOUNT);

        vm.stopBroadcast();

        console2.log("========================================");
        console2.log("Tokens Minted Successfully!");
        console2.log("========================================");
        console2.log("Deployer now has sufficient balance for price sync");
        console2.log("");
        console2.log("Next step:");
        console2.log("  forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast");
    }
}
