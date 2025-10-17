// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CheckBalances
 * @notice Check deployer token balances
 */
contract CheckBalances is Script {
    using stdJson for string;

    address public wbnbToken;
    address public btcToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;
    address public usdtToken;

    function setUp() public {
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

    function run() public view {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deployer Token Balances");
        console2.log("========================================");
        console2.log("Deployer address:", deployer);
        console2.log("");

        uint256 wbnbBalance = IERC20(wbnbToken).balanceOf(deployer);
        uint256 btcBalance = IERC20(btcToken).balanceOf(deployer);
        uint256 ethBalance = IERC20(ethToken).balanceOf(deployer);
        uint256 adaBalance = IERC20(adaToken).balanceOf(deployer);
        uint256 bchBalance = IERC20(bchToken).balanceOf(deployer);
        uint256 usdtBalance = IERC20(usdtToken).balanceOf(deployer);

        console2.log("Balances:");
        console2.log("  WBNB:", wbnbBalance / 1e18);
        console2.log("  BTCB:", btcBalance / 1e18);
        console2.log("  ETH:", ethBalance / 1e18);
        console2.log("  ADA:", adaBalance / 1e18);
        console2.log("  BCH:", bchBalance / 1e18);
        console2.log("  USDT:", usdtBalance / 1e18);
        console2.log("");

        if (wbnbBalance == 0 && btcBalance == 0 && ethBalance == 0 && adaBalance == 0 && bchBalance == 0
            && usdtBalance == 0) {
            console2.log("ERROR: All balances are ZERO!");
            console2.log("Please run: forge script script/MintTokensForSync.s.sol --rpc-url bnb_testnet --broadcast");
        } else {
            console2.log("Balances look good! Ready for price sync.");
        }
    }
}
