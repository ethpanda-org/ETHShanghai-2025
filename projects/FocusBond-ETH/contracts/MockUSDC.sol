// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing purposes with permit functionality
 */
contract MockUSDC is ERC20, ERC20Permit, Ownable {
    uint8 private _decimals = 6;

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(initialOwner) {
        // Mint initial supply to owner (1M USDC)
        _mint(initialOwner, 1_000_000 * 10**_decimals);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to specified address (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in token units, not wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount * 10**_decimals);
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
     * @param amount Amount to mint (in token units, max 1000 USDC)
     */
    function faucet(uint256 amount) external {
        require(amount <= 1000, "MockUSDC: faucet amount too large");
        _mint(msg.sender, amount * 10**_decimals);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount to burn (in token units)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount * 10**_decimals);
    }

    /**
     * @dev Burn exact amount from caller's balance
     * @param amount Exact amount to burn (including decimals)
     */
    function burnExact(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}