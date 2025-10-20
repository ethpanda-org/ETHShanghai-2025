// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MockWETH.sol";

/**
 * @title FocusVault
 * @notice ERC4626 compliant vault for staking ETH in FocusBond sessions
 * @dev Users deposit ETH and receive vault shares (fvETH)
 *      Shares accumulate rewards from successful focus sessions
 */
contract FocusVault is ERC4626, Ownable, ReentrancyGuard {
    // Wrapper for ETH to make it ERC20 compatible
    MockWETH public immutable weth;
    
    // FocusBond contract that can distribute rewards
    address public focusBond;
    
    // Total rewards accumulated in the vault
    uint256 public totalRewards;
    
    // Minimum deposit amount (0.0001 ETH)
    uint256 public constant MIN_DEPOSIT = 0.0001 ether;
    
    // Maximum deposit amount (10 ETH)
    uint256 public constant MAX_DEPOSIT = 10 ether;
    
    // Events
    event RewardDistributed(address indexed user, uint256 amount);
    event FocusBondUpdated(address indexed oldAddress, address indexed newAddress);
    event ETHDeposited(address indexed user, uint256 amount, uint256 shares);
    event ETHWithdrawn(address indexed user, uint256 amount, uint256 shares);
    
    constructor(MockWETH _weth) 
        ERC4626(_weth)
        ERC20("Focus Vault ETH", "fvETH") 
        Ownable(msg.sender)
    {
        weth = _weth;
    }
    
    /**
     * @notice Set the FocusBond contract address
     * @param _focusBond Address of the FocusBond contract
     */
    function setFocusBond(address _focusBond) external onlyOwner {
        require(_focusBond != address(0), "Invalid address");
        address oldAddress = focusBond;
        focusBond = _focusBond;
        emit FocusBondUpdated(oldAddress, _focusBond);
    }
    
    /**
     * @notice Deposit ETH and receive vault shares
     * @return shares Amount of vault shares minted
     */
    function depositETH() external payable nonReentrant returns (uint256 shares) {
        require(msg.value >= MIN_DEPOSIT, "Deposit too small");
        require(msg.value <= MAX_DEPOSIT, "Deposit too large");
        
        // Wrap ETH to WETH
        weth.deposit{value: msg.value}();
        
        // Calculate shares to mint (1:1 ratio initially)
        uint256 assets = msg.value;
        uint256 supply = totalSupply();
        
        if (supply == 0) {
            shares = assets;  // First depositor gets 1:1 shares
        } else {
            shares = (assets * supply) / totalAssets();
        }
        
        // Mint shares to user
        _mint(msg.sender, shares);
        
        // Emit ERC4626 Deposit event
        emit Deposit(msg.sender, msg.sender, assets, shares);
        emit ETHDeposited(msg.sender, msg.value, shares);
        return shares;
    }
    
    /**
     * @notice Withdraw ETH by burning vault shares
     * @param shares Amount of vault shares to burn
     * @return assets Amount of ETH withdrawn
     */
    function withdrawETH(uint256 shares) external nonReentrant returns (uint256 assets) {
        // Calculate assets to return
        uint256 supply = totalSupply();
        assets = (shares * totalAssets()) / supply;
        
        // Burn shares from user
        _burn(msg.sender, shares);
        
        // Unwrap WETH to ETH
        weth.withdraw(assets);
        
        // Send ETH to user
        (bool success, ) = msg.sender.call{value: assets}("");
        require(success, "ETH transfer failed");
        
        // Emit ERC4626 Withdraw event
        emit Withdraw(msg.sender, msg.sender, msg.sender, assets, shares);
        emit ETHWithdrawn(msg.sender, assets, shares);
        return assets;
    }
    
    /**
     * @notice Distribute rewards from completed focus sessions
     * @dev Only callable by FocusBond contract
     * @param amount Amount of ETH rewards to distribute
     */
    function distributeRewards(uint256 amount) external payable {
        require(msg.sender == focusBond, "Only FocusBond");
        require(msg.value == amount, "Incorrect ETH amount");
        
        // Wrap ETH to WETH
        weth.deposit{value: msg.value}();
        
        // Rewards increase the value of existing shares
        totalRewards += amount;
        
        emit RewardDistributed(msg.sender, amount);
    }
    
    /**
     * @notice Calculate the staking boost multiplier based on vault shares
     * @param user Address of the user
     * @return multiplier Boost multiplier in basis points (10000 = 1x)
     */
    function getStakingBoost(address user) external view returns (uint256 multiplier) {
        uint256 userShares = balanceOf(user);
        if (userShares == 0) return 10000; // 1x (no boost)
        
        uint256 userAssets = convertToAssets(userShares);
        
        // Calculate boost: 1x base + 0.5x per 0.1 ETH staked (max 5x)
        // Example: 0.1 ETH = 1.5x, 0.2 ETH = 2x, 0.8 ETH+ = 5x
        uint256 boostBps = 10000 + (userAssets * 5000 / 0.1 ether);
        
        // Cap at 5x (50000 basis points)
        if (boostBps > 50000) boostBps = 50000;
        
        return boostBps;
    }
    
    /**
     * @notice Get user's staked ETH amount
     * @param user Address of the user
     * @return amount Amount of ETH staked
     */
    function getUserStake(address user) external view returns (uint256 amount) {
        return convertToAssets(balanceOf(user));
    }
    
    /**
     * @notice Get vault total value (assets + rewards)
     * @return total Total value in ETH
     */
    function totalValue() external view returns (uint256 total) {
        return totalAssets();
    }
    
    /**
     * @notice Override totalAssets to include accumulated rewards
     */
    function totalAssets() public view override returns (uint256) {
        return weth.balanceOf(address(this));
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
