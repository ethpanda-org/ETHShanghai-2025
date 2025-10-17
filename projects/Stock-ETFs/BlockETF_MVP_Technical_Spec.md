# BlockETF TOP5 Index - 技术规格文档

## 1. 技术架构概览

### 1.1 系统架构
```
用户 → Web3前端 → 智能合约 → PancakeSwap → 5种代币池
                      ↓
                  价格预言机
```

### 1.2 核心组件
- **BlockETF主合约**：处理申购/赎回逻辑
- **TOP5代币合约**：BEP-20标准的ETF份额代币
- **PancakeRouter**：执行代币交换
- **价格获取模块**：从PancakeSwap池获取实时价格

## 2. BSC链环境配置

### 2.1 网络信息
```javascript
// BSC主网
{
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.binance.org/",
  explorerUrl: "https://bscscan.com",
  nativeCurrency: "BNB"
}

// BSC测试网
{
  chainId: 97,
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  explorerUrl: "https://testnet.bscscan.com",
  nativeCurrency: "tBNB"
}
```

### 2.2 代币地址映射

#### BSC主网代币地址
```solidity
address constant USDT = 0x55d398326f99059fF775485246999027B3197955;
address constant BTCB = 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c;
address constant ETH = 0x2170Ed0880ac9A755fd29B2688956BD959F933F8;
address constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c; // Wrapped BNB
address constant XRP = 0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE;
address constant SOL = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
```

#### BSC测试网代币地址
```solidity
// 需要部署测试代币或使用官方测试代币
address constant USDT_TEST = // 待确定
address constant BTCB_TEST = // 待确定
// ... 其他测试代币
```

### 2.3 PancakeSwap集成

#### Router地址
```solidity
// PancakeSwap V2 Router (主网)
address constant PANCAKE_ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;

// PancakeSwap V2 Router (测试网)
address constant PANCAKE_ROUTER_TESTNET = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
```

#### 主要交易对流动性池
```
USDT/BNB - 高流动性
BTCB/BNB - 高流动性
ETH/BNB - 高流动性
XRP/BNB - 中等流动性
SOL/BNB - 中等流动性
```

## 3. 智能合约设计

### 3.1 合约结构
```solidity
contracts/
├── core/
│   ├── BlockETFTop5.sol      // 主合约
│   └── TOP5Token.sol          // BEP-20份额代币
├── interfaces/
│   ├── IPancakeRouter.sol     // PancakeSwap接口
│   └── IBEP20.sol            // BEP-20接口
└── libraries/
    └── PriceCalculator.sol   // 价格计算库
```

### 3.2 主合约核心功能

#### 申购流程
```solidity
function deposit(uint256 usdtAmount) external returns (uint256 shares) {
    // 1. 从用户转入USDT
    IERC20(USDT).transferFrom(msg.sender, address(this), usdtAmount);

    // 2. 无申购费，全额用于购买资产
    uint256 netAmount = usdtAmount;

    // 3. 计算每种代币应购买的USDT金额（均衡分配）
    uint256 btcAmount = netAmount * 20 / 100;  // 20%
    uint256 ethAmount = netAmount * 20 / 100;  // 20%
    uint256 bnbAmount = netAmount * 20 / 100;  // 20%
    uint256 xrpAmount = netAmount * 20 / 100;  // 20%
    uint256 solAmount = netAmount * 20 / 100;  // 20%

    // 4. 通过PancakeSwap购买各代币
    _swapUSDTForToken(BTCB, btcAmount);
    _swapUSDTForToken(ETH, ethAmount);
    _swapUSDTForBNB(bnbAmount);
    _swapUSDTForToken(XRP, xrpAmount);
    _swapUSDTForToken(SOL, solAmount);

    // 5. 计算并铸造份额
    shares = _calculateShares(netAmount);
    TOP5Token.mint(msg.sender, shares);
}
```

#### 资产管理功能
```solidity
// 资产结构体
struct Asset {
    address token;      // 代币地址
    uint256 weight;     // 权重 (basis points, 10000 = 100%)
    bool isActive;      // 是否启用
}

mapping(address => Asset) public assets;
address[] public assetList;

// 设置资产组合
function setAssets(
    address[] memory _tokens,
    uint256[] memory _weights
) external onlyOwner {
    require(_tokens.length == _weights.length, "Length mismatch");
    require(_tokens.length >= 2 && _tokens.length <= 10, "Invalid asset count"); // 2-10个资产

    uint256 totalWeight = 0;
    for (uint256 i = 0; i < _weights.length; i++) {
        require(_weights[i] >= 500 && _weights[i] <= 5000, "Weight out of range"); // 5%-50%
        totalWeight += _weights[i];
    }
    require(totalWeight == 10000, "Weights must sum to 100%");

    // 清除旧配置
    for (uint256 i = 0; i < assetList.length; i++) {
        delete assets[assetList[i]];
    }
    delete assetList;

    // 设置新配置
    for (uint256 i = 0; i < _tokens.length; i++) {
        assets[_tokens[i]] = Asset({
            token: _tokens[i],
            weight: _weights[i],
            isActive: true
        });
        assetList.push(_tokens[i]);
    }

    emit AssetsUpdated(_tokens, _weights);
}

// 手动再平衡
function rebalance() external onlyOwner {
    require(!paused, "Contract paused");

    // 计算当前总价值
    uint256 totalValue = calculateTotalValue();

    for (uint256 i = 0; i < assetList.length; i++) {
        address token = assetList[i];
        uint256 targetWeight = assets[token].weight;

        // 计算目标价值和当前价值
        uint256 targetValue = totalValue * targetWeight / 10000;
        uint256 currentValue = getAssetValue(token);

        if (currentValue > targetValue) {
            // 需要卖出
            uint256 sellAmount = (currentValue - targetValue) * getTokenBalance(token) / currentValue;
            _swapTokenForUSDT(token, sellAmount);
        } else if (currentValue < targetValue) {
            // 需要买入
            uint256 buyUsdtAmount = targetValue - currentValue;
            _swapUSDTForToken(token, buyUsdtAmount);
        }
    }

    emit Rebalanced(block.timestamp);
}

// 紧急控制
bool public paused = false;

modifier whenNotPaused() {
    require(!paused, "Contract paused");
    _;
}

function pause() external onlyOwner {
    paused = true;
    emit Paused(msg.sender);
}

function unpause() external onlyOwner {
    paused = false;
    emit Unpaused(msg.sender);
}
```

#### 赎回流程
```solidity
function withdraw(uint256 shares) external returns (uint256 usdtAmount) {
    // 1. 更新管理费（在赎回前计算累积费用）
    _collectManagementFee();

    // 2. 销毁用户份额
    TOP5Token.burn(msg.sender, shares);

    // 3. 计算用户应得的各代币数量
    uint256 totalShares = TOP5Token.totalSupply();
    uint256 userRatio = shares * 1e18 / totalShares;

    // 4. 将各代币换回USDT
    uint256 btcUsdt = _swapTokenForUSDT(BTCB, _getTokenBalance(BTCB) * userRatio / 1e18);
    uint256 ethUsdt = _swapTokenForUSDT(ETH, _getTokenBalance(ETH) * userRatio / 1e18);
    uint256 bnbUsdt = _swapBNBForUSDT(_getBNBBalance() * userRatio / 1e18);
    uint256 xrpUsdt = _swapTokenForUSDT(XRP, _getTokenBalance(XRP) * userRatio / 1e18);
    uint256 solUsdt = _swapTokenForUSDT(SOL, _getTokenBalance(SOL) * userRatio / 1e18);

    // 5. 扣除赎回费用（0.3%）并返还USDT
    usdtAmount = (btcUsdt + ethUsdt + bnbUsdt + xrpUsdt + solUsdt) * 997 / 1000;
    IERC20(USDT).transfer(msg.sender, usdtAmount);
}
```

### 3.3 价格计算与费用管理

#### NAV计算
```solidity
function calculateNAV() public view returns (uint256) {
    uint256 btcValue = _getTokenBalance(BTCB) * _getTokenPrice(BTCB) / 1e18;
    uint256 ethValue = _getTokenBalance(ETH) * _getTokenPrice(ETH) / 1e18;
    uint256 bnbValue = _getBNBBalance() * _getBNBPrice() / 1e18;
    uint256 xrpValue = _getTokenBalance(XRP) * _getTokenPrice(XRP) / 1e18;
    uint256 solValue = _getTokenBalance(SOL) * _getTokenPrice(SOL) / 1e18;

    uint256 totalValue = btcValue + ethValue + bnbValue + xrpValue + solValue;
    uint256 totalShares = TOP5Token.totalSupply();

    return totalValue * 1e18 / totalShares; // NAV per share
}
```

#### 管理费收取
```solidity
uint256 public constant MANAGEMENT_FEE_RATE = 80; // 0.8% 年化费率 (basis points / 100)
uint256 public lastFeeCollectionTime;

function _collectManagementFee() internal {
    uint256 timePassed = block.timestamp - lastFeeCollectionTime;
    if (timePassed > 0) {
        // 计算应收管理费（按日计提）
        uint256 totalValue = calculateTotalValue();
        uint256 dailyFee = totalValue * MANAGEMENT_FEE_RATE * timePassed / (365 days * 10000);

        // 通过铸造新份额给管理方收取费用
        uint256 feeShares = dailyFee * TOP5Token.totalSupply() / (totalValue - dailyFee);
        TOP5Token.mint(feeRecipient, feeShares);

        lastFeeCollectionTime = block.timestamp;
    }
}

## 4. Gas优化策略

### 4.1 批量交换
- 使用multicall批量执行多个swap操作
- 预先approve无限额度，减少approve交易

### 4.2 存储优化
- 使用packed struct存储配置信息
- 避免重复读取storage变量

### 4.3 BSC特性利用
- BSC gas费用低（约$0.1-0.5/交易）
- 区块时间3秒，交易确认快
- 支持更大的区块容量

## 5. 安全考虑

### 5.1 重入攻击防护
```solidity
modifier nonReentrant() {
    require(!locked, "Reentrant call");
    locked = true;
    _;
    locked = false;
}
```

### 5.2 滑点保护
```solidity
function _swapWithSlippageProtection(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut // 最小输出量，防止MEV攻击
) internal {
    // 设置最大3%滑点
    uint256 expectedOut = _getExpectedOutput(tokenIn, tokenOut, amountIn);
    require(minAmountOut >= expectedOut * 97 / 100, "Slippage too high");
}
```

### 5.3 暂停机制
```solidity
bool public paused;

modifier whenNotPaused() {
    require(!paused, "Contract paused");
    _;
}
```

## 6. 测试计划

### 6.1 单元测试
- 申购功能测试（不同金额）
- 赎回功能测试（部分/全部）
- 费用计算正确性
- NAV计算准确性

### 6.2 集成测试
- 与PancakeSwap交互测试
- 多用户并发申赎测试
- Gas消耗测试
- 极端市场条件测试

### 6.3 测试数据
```javascript
// 测试场景
const testScenarios = [
    { amount: 100, expectedShares: "~100" },    // 小额
    { amount: 1000, expectedShares: "~1000" },  // 中额
    { amount: 10000, expectedShares: "~10000" } // 大额
];
```

## 7. 前端集成

### 7.1 Web3连接
```javascript
// 使用ethers.js连接BSC
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const signer = provider.getSigner();
```

### 7.2 合约交互
```javascript
// 申购
async function deposit(amount) {
    const contract = new ethers.Contract(BLOCKETF_ADDRESS, ABI, signer);

    // 先approve USDT
    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
    await usdt.approve(BLOCKETF_ADDRESS, amount);

    // 执行申购
    const tx = await contract.deposit(amount);
    await tx.wait();
}
```

### 7.3 数据展示
- 实时TVL：每10秒更新
- 用户份额：连接钱包后显示
- 资产分布：饼图展示5种代币比例
- 历史净值：折线图展示

## 8. 监控与运维

### 8.1 链上监控
- 监控合约余额
- 监控大额交易
- 监控价格异常波动
- 监控gas价格

### 8.2 告警机制
- TVL突然下降>20%
- 单笔交易失败
- 价格偏离>5%
- Gas费用异常高

### 8.3 应急预案
- 发现漏洞：立即暂停合约
- 流动性不足：限制大额赎回
- 价格异常：使用备用价格源

## 9. 上线检查清单

### 9.1 合约部署前
- [ ] 完成代码审计
- [ ] 测试网充分测试
- [ ] 多签钱包准备
- [ ] 初始流动性准备

### 9.2 部署时
- [ ] 验证合约代码
- [ ] 设置正确的参数
- [ ] 转移所有权到多签
- [ ] 小额测试交易

### 9.3 部署后
- [ ] 监控系统启动
- [ ] 社区公告发布
- [ ] 流动性激励启动
- [ ] 24小时值守

## 10. 成本分析

### 10.1 部署成本
- 合约部署：约0.5-1 BNB
- 初始测试：约0.1 BNB
- 总计：约$300-500

### 10.2 运营成本
- 每笔申购gas：约0.001-0.002 BNB（$0.3-0.6）
- 每笔赎回gas：约0.002-0.003 BNB（$0.6-0.9）
- 月度运维：约$100

### 10.3 收益预测
- 申购费：0%（免费申购吸引用户）
- 赎回费：0.3% × 赎回量
- 管理费：0.8% × TVL / 年
- 预计盈亏平衡：TVL达到$50,000（主要靠管理费）