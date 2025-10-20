// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockFOCUS
 * @dev Mock FOCUS token for testing purposes with 18 decimals and permit functionality
 */
contract MockFOCUS is ERC20, ERC20Permit, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(initialOwner) {
        // Mint initial supply to owner (1M FOCUS)
        _mint(initialOwner, 1_000_000 * 10**18);
    }

    /**
     * @dev Mint tokens to specified address (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in token units, not wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount * 10**18);
    }

    /**
     * @dev Mint tokens with exact amount (including decimals)
     * @param to Address to mint tokens to
     * @param amount Exact amount to mint (including decimals)
     */
    function mintExact(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function for testing - anyone can mint small amounts
     * @param amount Amount to mint (in token units, max 10000 FOCUS)
     */
    function faucet(uint256 amount) external {
        require(amount <= 10000, "MockFOCUS: faucet amount too large");
        _mint(msg.sender, amount * 10**18);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount to burn (in token units)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount * 10**18);
    }

    /**
     * @dev Burn exact amount from caller's balance
     * @param amount Exact amount to burn (including decimals)
     */
    function burnExact(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
