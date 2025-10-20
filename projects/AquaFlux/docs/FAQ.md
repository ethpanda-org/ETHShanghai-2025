# AquaFlux 常见问题 (FAQ)

> 快速解答关于AquaFlux协议的常见疑问

---

## 📖 概念问题

### Q1: 什么是三代币模型 (Tri-Token Model)?

**A:** AquaFlux将一份底层RWA资产拆分成三个独立交易的ERC-20代币:

- **P-Token (本金层)**: 代表到期时对本金的索取权，低风险
- **C-Token (票息层)**: 代表对利息/票息的索取权，中等风险
- **S-Token (首损层)**: 承担首笔损失，获得额外费用激励，高风险

**核心公式**: `1 AqToken = 1 P-Token + 1 C-Token + 1 S-Token`

---

### Q2: 为什么要拆分资产?

**A:** 传统债券是"打包"产品，投资者只能全盘接受其风险/收益。拆分后:

1. **灵活配置**: 保守投资者只买P，激进投资者买C+S
2. **提升流动性**: 三类代币可在AMM独立交易，总流动性更高
3. **风险隔离**: S-Token吸收首损，保护P和C
4. **收益定制**: 可组合出不同风险/收益曲线的产品

**类比**: 就像把一个披萨拆成 "饼皮(P) + 芝士(C) + 配料(S)"，每个人按需购买。

---

### Q3: 如果底层资产违约会怎样?

**A:** 采用**瀑布式分配 (Waterfall)**机制:

```
假设投资100 USDC，到期只收回80 USDC (损失20%)

损失吸收顺序: S → C → P
1. S-Token 首先吸收损失 (最多100%)
2. S归零后，C-Token 开始吸收
3. C归零后，P-Token 最后吸收

示例分配 (假设S占10%):
- S-Token: 0 USDC (全部损失)
- C-Token: 5 USDC (损失50%)
- P-Token: 75 USDC (损失6.25%)
```

**设计目标**: S持有者承担主要风险，P持有者获得相对保护。

---

### Q4: S-Token持有者为什么愿意承担首损?

**A:** 激励机制:

1. **费用奖励**: 协议所有手续费的一部分分配给S持有者
2. **超额收益**: 若资产表现超预期，S享受更高分成
3. **协议代币**: 未来可能空投治理代币给早期S持有者

**类比**: 类似CDO的Equity层 — 高风险高回报。

---

## 🛠️ 技术问题

### Q5: 为什么使用UUPS而非Transparent Proxy?

**A:** UUPS优势:

1. **Gas更低**: 代理合约更小 (无需管理员逻辑)
2. **更安全**: 升级逻辑在实现合约中，代理合约不可篡改
3. **更灵活**: 可自定义升级权限检查

**限制**: 实现合约必须正确实现 `_authorizeUpgrade()`，否则合约可能永久无法升级。

---

### Q6: EIP-1167 Minimal Proxy有什么优势?

**A:** 对比:

| 方案 | 部署成本 | 运行成本 | 灵活性 |
|------|---------|---------|-------|
| **完整复制** | ~2M gas | 标准 | 高 |
| **EIP-1167** | ~45k gas | +2k gas/调用 | 高 |

**结论**: 每个资产需部署4个代币 (Aq/P/C/S)，使用Minimal Proxy可节省**>95% Gas**。

额外的调用成本 (delegatecall开销) 远低于部署节省。

---

### Q7: 如何防止到期分配时的精度损失?

**A:** 措施:

1. **固定供应量快照**: `setDistributionPlan()` 时记录总供应量
2. **高精度计算**: 使用18位小数
3. **尘额处理**: 小于1 wei的余额归入协议费用池
4. **审计验证**: 确保 `Σ(分配额) ≤ 总金额`

**公式**:
```solidity
userReward = userBalance * totalAllocation / fixedSupply
```

**示例**: 用户持有 1.234567890123456789 P-Token，不会因精度损失而少领。

---

### Q8: 合约如何防止重入攻击?

**A:** 多重防护:

1. **ReentrancyGuard**: 所有外部调用加 `nonReentrant` 修饰符
2. **CEI模式**: Checks → Effects → Interactions 顺序
3. **SafeERC20**: 包装所有代币转账
4. **只读视图**: 查询函数标记为 `view`

**关键代码**:
```solidity
function split(bytes32 assetId, uint256 amount) 
    external 
    nonReentrant          // 防重入
    whenNotPaused         // 暂停检查
{
    // 1. Checks (验证)
    require(assets[assetId].isVerified, "Not verified");
    
    // 2. Effects (状态变更)
    _burnAqToken(msg.sender, amount);
    _updateFeeAccounting(assetId, fee);
    
    // 3. Interactions (外部调用)
    _mintPCS(msg.sender, netAmount);  // 最后才调用外部合约
}
```

---

### Q9: 时间锁治理的延迟时间是多久?

**A:** 默认配置:

- **最小延迟**: 48小时
- **最大延迟**: 30天

**流程**:
1. 提议 (Propose): 提交升级/参数变更提案
2. 延迟 (Delay): 等待48小时
3. 执行 (Execute): 时间窗口内执行

**紧急暂停**: `OPERATOR_ROLE` 可立即暂停单个资产 (无需时间锁)。

---

## 💼 使用问题

### Q10: 我可以只持有一种代币吗?

**A:** 完全可以! 这正是三代币模型的优势。

**场景**:
- **退休人士**: 只买P-Token (保本)
- **收益追求者**: 只买C-Token (票息)
- **投机者**: 只买S-Token (杠杆收益)

你可以在DEX (如Uniswap) 上单独购买任意代币，无需持有完整的P+C+S组合。

---


### Q11: 到期后我必须领取吗?不领取会怎样?

**A:** 不领取的后果:

1. **资金安全**: 收益永久锁定在合约中，不会消失
2. **无法转移**: P/C/S代币在领取时会被销毁，但可以转给他人让其领取
3. **无利息**: 未领取的资金不计息

**建议**: 到期后尽快领取，避免资金闲置。

**技术细节**: 合约无"过期"机制，理论上10年后仍可领取。

---

### Q12: 如何查看我的历史操作记录?

**A:** 三种方式:

1. **前端 Portfolio 页面**: 显示所有交易历史
2. **区块链浏览器**: 
   - Etherscan → 你的地址 → Internal Txns
   - 搜索 `AssetSplit`, `AssetMerge` 等事件
3. **后端API**:
   ```bash
   curl http://api.aquaflux.pro/v1/user/{address}/transactions
   ```

---


---

## 🔒 安全问题

### Q13: 合约会被恶意升级吗?

**A:** 防护机制:

1. **时间锁强制延迟**: 升级需等待48小时
2. **多签控制**: `TIMELOCK_ROLE` 由多签钱包持有 (3/5或5/7)
3. **公开透明**: 升级提案在链上公示，社区可监督
4. **紧急暂停**: 发现恶意升级可立即暂停

**极端情况**: 可fork合约并迁移到新版本。

---

### Q14: 智能合约的Admin权限有多大?

**A:** 权限列表:

| 角色 | 可以做 | 不能做 |
|------|--------|--------|
| `ADMIN` | 分配角色 | 直接转走用户资金 |
| `TIMELOCK` | 升级合约、修改费率 | 绕过时间锁 |
| `VERIFIER` | 审核资产 | 修改已验证资产 |
| `OPERATOR` | 暂停资产 | 销毁代币 |

**关键**: 任何角色都**无法**直接转走用户的P/C/S代币或底层资产!

---

## 🌐 生态问题

### Q15: 可以在Uniswap交易P/C/S代币吗?

**A:** 完全可以! P/C/S是标准ERC-20代币:

1. **自动路由**: Uniswap会自动发现交易对
2. **创建流动性池**: 
   ```
   P-Token / USDC
   C-Token / USDC
   S-Token / USDC
   P-Token / C-Token  (策略组合)
   ```
3. **聚合器支持**: 1inch、Matcha等也能交易

**前端集成**: AquaFlux dApp已集成Uniswap V3报价。

---

## 📞 支持与反馈

### 找不到问题答案?

- 📧 **Email**: hi@aquaflux.pro
- 💬 **wechat**: 1547621
- 📖 **文档**: [docs.aquaflux.pro](./README.md)
- 🐛 **Bug报告**: [GitHub Issues](https://github.com/aquaflux/issues)

### 贡献FAQ

发现新的高频问题? 欢迎PR到本文档!

```bash
# Fork项目
git clone https://github.com/yourusername/aquaflux
cd aquaflux/docs

# 编辑FAQ
vim FAQ.md

# 提交PR
git add FAQ.md
git commit -m "docs: add Q26 about XYZ"
git push origin main
```

---

**最后更新**: 2025-10-20  
**维护者**: AquaFlux Documentation Team  
**版本**: v1.0

