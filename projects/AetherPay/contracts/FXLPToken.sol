// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FXLPToken
 * @notice LP token for FXPool liquidity providers
 * @dev Mintable and burnable by FXPool contract only
 */
contract FXLPToken is ERC20, Ownable {
    address public fxPool;
    string public pair;
    
    modifier onlyPool() {
        require(msg.sender == fxPool, "Only FXPool can call");
        _;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _pair,
        address _fxPool
    ) ERC20(_name, _symbol) {
        require(_fxPool != address(0), "Invalid pool address");
        pair = _pair;
        fxPool = _fxPool;
    }
    
    /**
     * @notice Mint LP tokens to liquidity provider
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyPool {
        _mint(to, amount);
    }
    
    /**
     * @notice Burn LP tokens from liquidity provider
     * @param from Token holder address
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyPool {
        _burn(from, amount);
    }
    
    /**
     * @notice Update FXPool address (migration support)
     * @param _newPool New pool address
     */
    function setFXPool(address _newPool) external onlyOwner {
        require(_newPool != address(0), "Invalid pool address");
        fxPool = _newPool;
    }
}