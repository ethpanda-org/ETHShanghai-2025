// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockWETH
 * @notice Mock Wrapped Ether (WETH) 用于测试
 * @dev 简化版本的 WETH，支持 mint 功能用于测试
 */
contract MockWETH is ERC20 {
    // ============ 事件 ============
    
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    // ============ 构造函数 ============
    
    constructor() ERC20("Wrapped Ether", "WETH") {
        // 18 decimals (默认)
    }

    // ============ 存款函数 ============
    
    /**
     * @notice 存入 ETH 并铸造等量 WETH
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice 销毁 WETH 并提取等量 ETH
     * @param wad 提取数量
     */
    function withdraw(uint256 wad) public {
        require(balanceOf(msg.sender) >= wad, "MockWETH: insufficient balance");
        _burn(msg.sender, wad);
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    // ============ 测试辅助函数 ============
    
    /**
     * @notice Mint WETH (仅用于测试)
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Burn WETH (仅用于测试)
     * @param from 销毁地址
     * @param amount 销毁数量
     */
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    // ============ 支持接收 ETH ============
    
    receive() external payable {
        deposit();
    }

    fallback() external payable {
        deposit();
    }
}
