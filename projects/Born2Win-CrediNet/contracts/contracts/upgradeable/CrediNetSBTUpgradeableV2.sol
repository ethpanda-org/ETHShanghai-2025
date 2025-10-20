// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CrediNetSBTUpgradeable.sol";

contract CrediNetSBTUpgradeableV2 is CrediNetSBTUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV2() external reinitializer(2) {
        __ERC721_init_unchained(name(), symbol());
        __ERC721Enumerable_init_unchained();
        __ReentrancyGuard_init();
        __EIP712_init_unchained(name(), VERSION);
    }

    function versionV2() external pure returns (string memory) {
        return "v2";
    }
}
