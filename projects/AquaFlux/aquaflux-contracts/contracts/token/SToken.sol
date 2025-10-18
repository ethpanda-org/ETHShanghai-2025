// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseToken.sol";

/**
 * @title SToken
 * @dev Safety Token - represents the safety/risk component of the structured asset
 * This token provides first-loss protection and absorbs losses before P and C tokens
 */
contract SToken is BaseToken {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the SToken
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
        super.initialize(name_, symbol_, assetId_, "S", registry);
    }

    /**
     * @dev Returns the token type
     */
    function tokenType() public pure override returns (string memory) {
        return "S";
    }
} 