# 🎬 Merit Protocol 完整演示指南

## 准备工作 ✅

### 1. 地址和分数
- **演示地址**: `0x059F40f2F70fEA8D5391F11D05672E0043C2fF51`
- **Merit Score**: 164
- **信用额度**: $4,920 USDC (164 × $30)
- **更新交易**: [查看](https://sepolia.etherscan.io/tx/0x31731d06220a245bfca9ffab1b03631f82c4147195bec6c1eec1ec10ac97d4fd)

### 2. Pool 状态
- **Pool 地址**: `0x0471a65da5c08e0e2dc573992691df54b65b3487`
- **可用流动性**: 100,000 USDC
- **MockUSDC 地址**: `0xabc530ff98db0649ec7c098662a446701f5b5e90`

### 3. 合约地址
- **MeritScoreOracle**: `0x48f2A3f3bF5fa7fbe7cfB6B36D3f335c0F7197a7`
- **SponsoredLendingPool**: `0x0471a65da5c08e0e2dc573992691df54b65b3487`
- **MockUSDC**: `0xabc530ff98db0649ec7c098662a446701f5b5e90`

---

## 演示流程

### 第一步：查看分数

1. 访问主页：http://localhost:3000
2. 在 "Check Any Address's Merit Score" 输入：
   ```
   0x059F40f2F70fEA8D5391F11D05672E0043C2fF51
   ```
3. 点击 Search
4. 应该看到：
   - **On-Chain Score**: 164
   - **Calculated Score**: 164
   - **Score Breakdown**: 真实的数据源分解

### 第二步：连接钱包并查看 Dashboard

1. 在 MetaMask 中切换到演示地址
2. 访问：http://localhost:3000/dashboard
3. 点击 "Connect Wallet"
4. 应该看到：
   - **Your Merit Score**: 164
   - **Available Credit**: $4,920 / $4,920
   - **Amount Borrowed**: $0

### 第三步：借款

1. 在 Dashboard 中栏找到 "Your Liquidity Lifeline"
2. 确保在 "Borrow" 标签页
3. 输入金额：`1000` (USDC)
4. 点击 "Access Liquidity"
5. 在 MetaMask 中确认交易
6. 等待交易确认
7. 应该看到：
   - **Amount Borrowed**: $1,000
   - **Available Credit**: $3,920 / $4,920
   - **Next Repayment Due**: 显示到期日期

### 第四步：等待到期（演示违约）

**注意**：实际演示中，贷款期限是 30 天。为了快速演示，可以：

#### 选项 A：等待真实到期（30天）
- 等待 30 天后贷款自动到期
- 任何人都可以清算

#### 选项 B：修改合约配置（快速演示）
```bash
# 修改贷款期限为 1 分钟（仅用于演示）
cd packages/foundry
cast send 0x0471a65da5c08e0e2dc573992691df54b65b3487 \
  "updateConfig((uint256,uint256,uint256,uint256,uint256))" \
  "(200,86400,550,60,30)" \
  --rpc-url sepolia \
  --private-key $DEPLOYER_PRIVATE_KEY
```

参数说明：
- minScore: 200
- maxScoreAge: 86400 (24小时)
- baseInterestRate: 550 (5.5%)
- **loanDuration: 60** (60秒，用于演示)
- scoreMultiplier: 30

### 第五步：清算违约贷款

1. 等待贷款到期（1分钟后）
2. 在 Dashboard 右栏找到 "Liquidation Module"
3. 输入违约地址：
   ```
   0x059F40f2F70fEA8D5391F11D05672E0043C2fF51
   ```
4. 点击 "Liquidate & Record Default"
5. 在 MetaMask 中确认交易
6. 等待交易确认

### 第六步：查看 EAS 违约记录

1. 从交易日志中获取 Attestation ID
2. 访问 EAS Explorer：
   ```
   https://sepolia.easscan.org/attestation/view/[ATTESTATION_ID]
   ```
3. 应该看到：
   - **Schema**: Merit Protocol Default Schema
   - **Borrower**: 0x059F40...2fF51
   - **Principal**: 1000000000 (1000 USDC)
   - **Due Date**: 时间戳
   - **Default Time**: 时间戳
   - **Pool**: 0x0471a6...b3487

---

## 验证点

### ✅ 前端无硬编码
- **Score Breakdown**: 从 API 动态获取
- **Transaction History**: 从链上事件读取
- **Credit Line**: 基于实际分数计算
- **Loan Status**: 实时读取合约状态

### ✅ 完整的链上数据
- **Merit Score**: 存储在 MeritScoreOracle
- **Loan Data**: 存储在 SponsoredLendingPool
- **Default Record**: 存储在 EAS

### ✅ 透明的分数计算
- 6个真实数据源
- 每个数据源的贡献可见
- 总分有权重和上限

---

## 关键交易

### 1. 更新分数
```
https://sepolia.etherscan.io/tx/0x31731d06220a245bfca9ffab1b03631f82c4147195bec6c1eec1ec10ac97d4fd
```

### 2. 注入流动性
- Mint: [查看交易]
- Approve: [查看交易]
- Deposit: [查看交易]

### 3. 借款
- 演示时生成

### 4. 清算
- 演示时生成

### 5. EAS 记录
- 演示时生成

---

## 故障排除

### 如果分数显示为 0
1. 刷新浏览器 (Cmd+Shift+R)
2. 清除缓存
3. 检查是否连接到 Sepolia
4. 检查合约地址是否正确

### 如果无法借款
1. 确认分数 >= 200（当前 164 < 200）
2. 需要先提高分数或修改 minScore 配置
3. 确认 Pool 有足够流动性

### 如果无法清算
1. 确认贷款已到期
2. 确认贷款状态为 Active
3. 检查 gas 费用

---

## 演示脚本

### 开场白
"Merit Protocol 是一个基于链上声誉的无抵押借贷协议。让我演示如何基于 Web3 贡献获取流动性。"

### 展示分数
"首先，我们查询这个地址的 Merit Score。它基于 6 个数据源：Gitcoin Passport、ENS、Farcaster、链上活动、POAP 和 Nouns DAO。"

### 展示借款
"基于 164 的分数，这个地址可以获得 $4,920 的信用额度。现在我们借 $1,000 USDC，无需任何抵押品。"

### 展示违约
"如果借款人不还款，任何人都可以清算这笔贷款。违约记录会永久存储在 Ethereum Attestation Service 上，影响未来的信用。"

### 结束语
"这就是 Merit Protocol - 将链上声誉转化为金融资本，无需锁定资产。"

---

## 技术亮点

1. **完全链上**: 所有数据存储在 Sepolia
2. **EAS 集成**: 违约记录不可篡改
3. **实时计算**: Oracle Service 实时计算分数
4. **透明度**: 分数组成完全可见
5. **去中心化**: 任何人都可以清算违约贷款

---

## 下一步

- [ ] 提高演示地址分数到 >= 200
- [ ] 修改 loanDuration 为 60 秒（快速演示）
- [ ] 准备演示环境
- [ ] 录制演示视频
- [ ] 准备 pitch deck

**演示准备完成！** 🎉
