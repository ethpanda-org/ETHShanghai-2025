// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseToken.sol";

/**
 * @title PToken
 * @dev Principal Token - represents the principal component of the structured asset
 * This token represents the principal value and will be redeemed at maturity
 */
contract PToken is BaseToken {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the PToken
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
    ) public {
        super.initialize(name_, symbol_, assetId_, "P", registry);
    }

    /**
     * @dev Returns the token type
     */
    function tokenType() public pure override returns (string memory) {
        return "P";
    }
} 