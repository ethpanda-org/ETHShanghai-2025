// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing on BNB Testnet with minter role support
 * @dev Supports both owner and authorized minters for flexible mint control
 */
contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    // Minter role mapping
    mapping(address => bool) public minters;

    // Events
    event MinterUpdated(address indexed minter, bool status);

    constructor(string memory name, string memory symbol, uint8 tokenDecimals, uint256 initialSupply)
        ERC20(name, symbol)
        Ownable(msg.sender)
    {
        _decimals = tokenDecimals;

        // Mint initial supply to deployer
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens (owner or authorized minter)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @dev Can be called by owner or any address with minter role
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner() || minters[msg.sender], "MockERC20: not authorized to mint");
        _mint(to, amount);
    }

    /**
     * @notice Set minter status for an address (only owner)
     * @param minter Address to grant/revoke minter role
     * @param status True to grant, false to revoke
     */
    function setMinter(address minter, bool status) external onlyOwner {
        minters[minter] = status;
        emit MinterUpdated(minter, status);
    }

    /**
     * @notice Check if an address has minter role
     * @param account Address to check
     * @return True if address is owner or has minter role
     */
    function isMinter(address account) external view returns (bool) {
        return account == owner() || minters[account];
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
