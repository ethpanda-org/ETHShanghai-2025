// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import "forge-std/console.sol";
import {CAIRegistry} from "../src/CAIRegistry.sol";
import {AHINAnchor} from "../src/AHINAnchor.sol";
import {ERC8004Agent} from "../src/ERC8004Agent.sol";

contract CounterScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("ETH_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        CAIRegistry registry = new CAIRegistry();
        AHINAnchor anchor = new AHINAnchor();
        ERC8004Agent agent = new ERC8004Agent(address(registry), address(anchor));

        console.log("CAIRegistry deployed at", address(registry));
        console.log("AHINAnchor deployed at", address(anchor));
        console.log("ERC8004Agent deployed at", address(agent));

        vm.stopBroadcast();
    }
}
