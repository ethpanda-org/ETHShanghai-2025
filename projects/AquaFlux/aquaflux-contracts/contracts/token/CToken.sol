// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseToken.sol";

/**
 * @title CToken
 * @dev Coupon Token - represents the coupon/interest component of the structured asset
 * This token represents the interest payments and will receive periodic coupon payments
 */
contract CToken is BaseToken {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the CToken
     * @param name_ The token name
     * @param symbol_ The token symbol
     * @param assetId_ The asset identifier
     * @param registry The registry contract address
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        bytes32 assetId_,
        address registry
    ) public initializer {
        super.initialize(name_, symbol_, assetId_, "C", registry);
    }

    /**
     * @dev Returns the token type
     */
    function tokenType() public pure override returns (string memory) {
        return "C";
    }
} 