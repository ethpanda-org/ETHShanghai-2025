// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// 模拟Diamond合约
contract MockDiamond is Ownable {
    event PositionOpened(uint256 indexed tokenId, address indexed owner, address collateralToken, uint256 collateralAmount);
    event PositionClosed(uint256 indexed tokenId, address indexed owner);
    
    uint256 private nextPositionId = 1;
    
    // 定义交换参数结构体
    struct SwapParams {
        address tokenIn;
        uint256 amountIn;
        address tokenOut;
        bytes swapData;
    }
    
    constructor() Ownable(msg.sender) {}
    mapping(uint256 => address) public positionOwners;
    mapping(uint256 => address) public positionCollateralTokens;
    mapping(uint256 => uint256) public positionCollateralAmounts;
    mapping(uint256 => uint256) public positionDebtAmounts;
    
    // 模拟开仓函数 - 匹配前端期望的签名
    function openOrAddPositionFlashLoanV2(
        SwapParams calldata swapParams,
        address pool,
        uint256 positionId,
        uint256 amount,
        bytes calldata data
    ) external payable {
        // 模拟开仓逻辑
        uint256 newPositionId = nextPositionId++;
        positionOwners[newPositionId] = msg.sender;
        positionCollateralTokens[newPositionId] = swapParams.tokenIn;
        positionCollateralAmounts[newPositionId] = swapParams.amountIn;
        positionDebtAmounts[newPositionId] = swapParams.amountIn * 2; // 模拟2倍杠杆
        
        emit PositionOpened(newPositionId, msg.sender, swapParams.tokenIn, swapParams.amountIn);
    }
    
    // 模拟平仓函数
    function closeOrRemovePositionFlashLoanV2(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut,
        address swapTarget,
        bytes calldata swapData
    ) external {
        // 模拟平仓逻辑
        emit PositionClosed(1, msg.sender);
    }
    
    // 获取仓位信息
    function getPosition(uint256 tokenId) external view returns (uint256 collateralAmount, uint256 debtAmount) {
        return (positionCollateralAmounts[tokenId], positionDebtAmounts[tokenId]);
    }
    
    // 获取仓位债务比例
    function getPositionDebtRatio(uint256 tokenId) external view returns (uint256) {
        if (positionCollateralAmounts[tokenId] == 0) return 0;
        return (positionDebtAmounts[tokenId] * 10000) / positionCollateralAmounts[tokenId];
    }
    
    // 获取下一个仓位ID
    function getNextPositionId() external view returns (uint32) {
        return uint32(nextPositionId);
    }
    
    // 添加一个简单的测试函数
    function testFunction() external pure returns (string memory) {
        return "MockDiamond is working!";
    }
}

// 模拟代币合约
contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18); // 铸造100万个代币
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
