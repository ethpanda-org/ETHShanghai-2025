// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IBaseToken
 * @dev Base token interface for all AquaFlux tokens (AqToken, PToken, CToken, SToken)
 * 权限相关由 AccessControlUpgradeable 实现，接口无需 import IAccessControlUpgradeable
 */
interface IBaseToken is IERC20 {
    /**
     * @dev Emitted when tokens are minted
     * @param to The address receiving the minted tokens
     * @param amount The amount of tokens minted
     */
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @dev Emitted when tokens are burned
     * @param from The address whose tokens are burned
     * @param amount The amount of tokens burned
     */
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Returns the asset ID associated with this token
     * @return The asset ID as bytes32
     */
    function assetId() external view returns (bytes32);

    /**
     * @dev Returns the token type (AQ, P, C, S)
     * @return The token type as string
     */
    function tokenType() external view returns (string memory);

    /**
     * @dev Mints tokens to the specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;

    /**
     * @dev Burns tokens from the specified address
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) external;

    /**
     * @dev Pauses all token transfers
     */
    function pause() external;

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() external;
} 