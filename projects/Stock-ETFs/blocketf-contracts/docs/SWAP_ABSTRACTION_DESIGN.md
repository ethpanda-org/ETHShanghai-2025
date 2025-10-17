# Swap Abstraction Design - 代码复用优化

## 问题分析

### 当前情况

**ETFRouterV1** 和 **ETFRebalancerV1** 都实现了几乎相同的DEX交互逻辑：

| 功能 | ETFRouterV1 | ETFRebalancerV1 |
|------|-------------|-----------------|
| V2 exactInput swap | `_v2BuyAssetExactInput` | `_swapUSDTToWBNBV2ExactInput` |
| V2 exactOutput swap | `_v2BuyAssetExactOutput` | ❌ (已删除) |
| V2 sell asset | `_v2SellAssetExactInput` | `_swapWBNBToUSDTV2` |
| V3 exactInput swap | `_v3BuyAssetExactInput` | `_swapUSDTToAssetExactInput` |
| V3 exactOutput swap | `_v3BuyAssetExactOutput` | ❌ (已删除) |
| V3 sell asset | ❌ (未实现) | `_swapAssetToUSDT` |
| Pool configuration | `_getAssetPool` | `assetPools` mapping |
| Price oracle access | `_getAssetPrice` | `_getAssetPrice` |

### 代码重复度分析

**高度重复的代码**：
```solidity
// Router: _v2BuyAssetExactInput
IERC20(USDT).forceApprove(address(v2Router), usdtAmount);
try v2Router.swapExactTokensForTokens(
    usdtAmount, minOutput, path, address(this), block.timestamp + 300
) returns (uint256[] memory amounts) {
    assetAmount = amounts[1];
}
IERC20(USDT).forceApprove(address(v2Router), 0);

// Rebalancer: _swapUSDTToWBNBV2ExactInput
IERC20(USDT).forceApprove(address(v2Router), usdtAmount);
uint256[] memory amounts = v2Router.swapExactTokensForTokens(
    usdtAmount, 0, path, address(this), block.timestamp
);
return amounts[1];
```

**相似度**: 约90%，仅细节不同（滑点保护、错误处理）

## 设计方案

### 方案1: 抽象基础合约 (推荐)

创建 `BaseSwapHelper.sol` 抽象合约：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IPancakeV2Router.sol";
import "./interfaces/IBlockETFCore.sol";

/**
 * @title BaseSwapHelper
 * @notice Abstract contract providing common DEX swap functionality
 * @dev To be inherited by ETFRouterV1 and ETFRebalancerV1
 */
abstract contract BaseSwapHelper {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                            IMMUTABLE STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice Uniswap V3 style swap router
    ISwapRouter public immutable v3Router;

    /// @notice PancakeSwap V2 router
    IPancakeV2Router public immutable v2Router;

    /// @notice USDT token address
    address public immutable USDT;

    /// @notice WBNB token address
    address public immutable WBNB;

    /// @notice ETF Core contract (for oracle access)
    IBlockETFCore public immutable etfCore;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _v3Router,
        address _v2Router,
        address _usdt,
        address _wbnb,
        address _etfCore
    ) {
        require(_v3Router != address(0), "Invalid v3Router");
        require(_v2Router != address(0), "Invalid v2Router");
        require(_usdt != address(0), "Invalid USDT");
        require(_wbnb != address(0), "Invalid WBNB");
        require(_etfCore != address(0), "Invalid etfCore");

        v3Router = ISwapRouter(_v3Router);
        v2Router = IPancakeV2Router(_v2Router);
        USDT = _usdt;
        WBNB = _wbnb;
        etfCore = IBlockETFCore(_etfCore);
    }

    /*//////////////////////////////////////////////////////////////
                        V2 SWAP FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Swap exact token amount to another token using V2
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Exact input amount
     * @param minAmountOut Minimum output amount (slippage protection)
     * @return amountOut Actual output amount
     */
    function _v2SwapExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        IERC20(tokenIn).forceApprove(address(v2Router), amountIn);

        uint256[] memory amounts = v2Router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp
        );

        IERC20(tokenIn).forceApprove(address(v2Router), 0);
        return amounts[1];
    }

    /**
     * @notice Swap tokens to get exact output amount using V2
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountOut Exact output amount wanted
     * @param maxAmountIn Maximum input amount willing to pay
     * @return amountIn Actual input amount used
     */
    function _v2SwapExactOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 maxAmountIn
    ) internal returns (uint256 amountIn) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        IERC20(tokenIn).forceApprove(address(v2Router), maxAmountIn);

        uint256[] memory amounts = v2Router.swapTokensForExactTokens(
            amountOut,
            maxAmountIn,
            path,
            address(this),
            block.timestamp
        );

        IERC20(tokenIn).forceApprove(address(v2Router), 0);
        return amounts[0];
    }

    /*//////////////////////////////////////////////////////////////
                        V3 SWAP FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Swap exact token amount using V3
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Exact input amount
     * @param minAmountOut Minimum output amount
     * @param fee Pool fee tier
     * @return amountOut Actual output amount
     */
    function _v3SwapExactInput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) internal returns (uint256 amountOut) {
        IERC20(tokenIn).forceApprove(address(v3Router), amountIn);

        amountOut = v3Router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );

        IERC20(tokenIn).forceApprove(address(v3Router), 0);
    }

    /**
     * @notice Swap to get exact output amount using V3
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountOut Exact output amount wanted
     * @param maxAmountIn Maximum input amount
     * @param fee Pool fee tier
     * @return amountIn Actual input amount used
     */
    function _v3SwapExactOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 maxAmountIn,
        uint24 fee
    ) internal returns (uint256 amountIn) {
        IERC20(tokenIn).forceApprove(address(v3Router), maxAmountIn);

        amountIn = v3Router.exactOutputSingle(
            ISwapRouter.ExactOutputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: maxAmountIn,
                sqrtPriceLimitX96: 0
            })
        );

        IERC20(tokenIn).forceApprove(address(v3Router), 0);
    }

    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get asset price from ETF Core's price oracle
     * @param asset Asset address
     * @return price Asset price in USD (18 decimals)
     */
    function _getAssetPrice(address asset) internal view returns (uint256 price) {
        (bool success, bytes memory data) =
            address(etfCore).staticcall(abi.encodeWithSignature("priceOracle()"));

        if (success && data.length >= 32) {
            address oracle = abi.decode(data, (address));
            (bool priceSuccess, bytes memory priceData) =
                oracle.staticcall(abi.encodeWithSignature("getPrice(address)", asset));

            if (priceSuccess && priceData.length >= 32) {
                price = abi.decode(priceData, (uint256));
                if (price > 0) return price;
            }
        }

        revert("Price oracle access failed");
    }

    /**
     * @notice Calculate expected output for V2 swap
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @return amountOut Expected output amount
     */
    function _v2GetAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = v2Router.getAmountsOut(amountIn, path);
        return amounts[1];
    }

    /**
     * @notice Calculate required input for V2 swap to get exact output
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountOut Desired output amount
     * @return amountIn Required input amount
     */
    function _v2GetAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) internal view returns (uint256 amountIn) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = v2Router.getAmountsIn(amountOut, path);
        return amounts[0];
    }
}
```

### 使用方式

**ETFRouterV1 重构**：
```solidity
contract ETFRouterV1 is BaseSwapHelper, Ownable, Pausable, ReentrancyGuard {

    constructor(
        address _etfCore,
        address _v3Router,
        address _v2Router,
        address _usdt,
        address _wbnb
    )
        BaseSwapHelper(_v3Router, _v2Router, _usdt, _wbnb, _etfCore)
        Ownable(msg.sender)
    {
        // Router specific initialization
    }

    // 直接调用继承的函数
    function _sellAsset(address asset, uint256 amount) private returns (uint256) {
        if (asset == WBNB) {
            // Use V2 for WBNB
            uint256 minOutput = _calculateMinOutput(asset, amount);
            return _v2SwapExactInput(asset, USDT, amount, minOutput);
        } else {
            // Use V3 for other assets
            (address pool, uint24 fee) = _getAssetPool(asset);
            uint256 minOutput = _calculateMinOutput(asset, amount);
            return _v3SwapExactInput(asset, USDT, amount, minOutput, fee);
        }
    }
}
```

**ETFRebalancerV1 重构**：
```solidity
contract ETFRebalancerV1 is BaseSwapHelper, IRebalanceCallback, Ownable, Pausable {

    constructor(
        address _etfCore,
        address _v3Router,
        address _v2Router,
        address _usdt,
        address _wbnb
    )
        BaseSwapHelper(_v3Router, _v2Router, _usdt, _wbnb, _etfCore)
        Ownable(msg.sender)
    {
        // Rebalancer specific initialization
    }

    // 直接调用继承的函数
    function _sellAssetForUSDT(address asset, uint256 amount) private returns (uint256) {
        if (asset == USDT) return amount;

        if (asset == WBNB) {
            return _v2SwapExactInput(WBNB, USDT, amount, 0);
        } else {
            uint24 fee = _getPoolFee(asset);
            return _v3SwapExactInput(asset, USDT, amount, 0, fee);
        }
    }
}
```

## 优势分析

### ✅ 代码复用
- **减少重复代码**: ~200行重复代码变为共享基类
- **单一真相来源**: Swap逻辑只在一处定义
- **易于维护**: 修改swap逻辑只需改一次

### ✅ 一致性
- **统一的swap接口**: 两个合约使用相同的方法
- **统一的错误处理**: 集中处理swap失败
- **统一的安全实践**: approve/swap/clear approval模式

### ✅ 可测试性
- **独立测试基类**: 可以单独测试BaseSwapHelper
- **减少测试冗余**: 不需要为两个合约重复写相同的swap测试

### ✅ 可扩展性
- **新协议支持**: 添加Curve、Balancer等只需扩展基类
- **新功能**: Multi-hop swaps可以在基类中添加
- **版本升级**: V2/V3可以共享基础设施

## 劣势与风险

### ⚠️ 增加复杂度
- **继承链**: Router/Rebalancer需要理解BaseSwapHelper
- **初始化顺序**: Constructor需要正确传递参数
- **调试难度**: 问题可能在基类中

### ⚠️ 灵活性降低
- **个性化需求**: Router和Rebalancer的swap需求略有不同
  - Router: 需要try/catch和详细错误处理
  - Rebalancer: 可以简单revert，由Core验证
- **强耦合**: 改变基类会影响两个合约

### ⚠️ Gas考虑
- **额外跳转**: 函数调用多一层（虽然internal会内联）
- **代码大小**: 基类代码会被复制到两个合约

## 方案2: 独立的Swap库合约

不使用继承，而是部署一个独立的SwapHelper合约：

```solidity
contract SwapHelper {
    function v2SwapExactInput(...) external returns (...) {}
    function v3SwapExactInput(...) external returns (...) {}
}

contract ETFRouterV1 {
    SwapHelper public immutable swapHelper;

    function _sellAsset(...) private {
        return swapHelper.v2SwapExactInput(...);
    }
}
```

**优势**:
- ✅ 真正的代码共享（只部署一次）
- ✅ 独立升级

**劣势**:
- ❌ External calls消耗更多gas
- ❌ 需要额外的token approve管理

## 推荐决策

### 短期（当前阶段）
**建议**: 暂时保持现状，原因：
1. ✅ 两个合约已经实现并测试通过
2. ✅ 重构成本较高（需要大量测试更新）
3. ✅ Router和Rebalancer的swap需求有差异
4. ✅ 当前重复代码量可控（各自~200行）

### 中长期（下一版本）
**建议**: 实施方案1（抽象基类），时机：
1. 当需要添加新的Swap协议（Curve, Balancer）
2. 当需要支持multi-hop swaps
3. 当有第三个合约也需要swap功能时

### 实施步骤
如果决定重构：
1. 创建 `BaseSwapHelper.sol`
2. 将通用swap逻辑迁移到基类
3. Router和Rebalancer继承基类
4. 更新所有测试
5. Gas对比（确保没有回退）
6. 全面回归测试

## 结论

你的观察非常准确！确实存在代码重复。但考虑到：
- 当前项目阶段（已实现并测试）
- 重构成本vs收益
- 两个合约的细微差异

**建议**:
1. **当前**: 记录这个技术债务，不立即重构
2. **V2版本**: 如果添加新功能（multi-hop, 新协议），则实施抽象基类方案
3. **标记TODO**: 在代码中添加注释标记未来重构点

```solidity
// TODO: Consider extracting to BaseSwapHelper when adding more swap protocols
// See: docs/SWAP_ABSTRACTION_DESIGN.md
function _v2SwapExactInput(...) private { }
```