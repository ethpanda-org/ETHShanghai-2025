// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseToken.sol";

/**
 * @title AqToken
 * @dev AquaFlux Asset Token - represents the wrapped underlying RWA asset
 * This is the main token that users receive when they wrap their RWA assets
 */
contract AqToken is BaseToken {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the AqToken
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
        super.initialize(name_, symbol_, assetId_, "AQ", registry);
    }

    /**
     * @dev Returns the token type
     */
    function tokenType() public pure override returns (string memory) {
        return "AQ";
    }
} 