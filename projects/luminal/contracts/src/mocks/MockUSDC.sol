// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USD Coin (USDC) 用于测试
 * @dev 简化版本的 USDC，6 decimals，支持 mint 功能用于测试
 */
contract MockUSDC is ERC20 {
    // ============ 常量 ============
    
    uint8 private constant DECIMALS = 6;  // USDC 使用 6 decimals

    // ============ 构造函数 ============
    
    constructor() ERC20("USD Coin", "USDC") {
        // 6 decimals (USDC 标准)
    }

    // ============ 覆盖 decimals ============
    
    /**
     * @notice 返回代币精度 (6 decimals)
     * @return 代币精度
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    // ============ 测试辅助函数 ============
    
    /**
     * @notice Mint USDC (仅用于测试)
     * @param to 接收地址
     * @param amount 铸造数量 (注意：6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Burn USDC (仅用于测试)
     * @param from 销毁地址
     * @param amount 销毁数量
     */
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    // ============ 便利函数 ============
    
    /**
     * @notice Mint USDC (以美元为单位)
     * @dev 自动转换为 6 decimals
     * @param to 接收地址
     * @param usdAmount 美元数量 (例如: 1000 = 1000 USDC)
     */
    function mintUSD(address to, uint256 usdAmount) external {
        _mint(to, usdAmount * 10**DECIMALS);
    }

    /**
     * @notice Batch mint USDC 给多个地址
     * @param recipients 接收地址数组
     * @param amounts 对应数量数组
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "MockUSDC: arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
}
