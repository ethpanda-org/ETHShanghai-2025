# DynamicSBTAgent 安全增强建议

## 概述
当前 DynamicSBTAgent.sol 合约存在一些安全隐患，本文档提供了详细的改进建议。

---

## 1. Oracle 权限过大问题

### 当前风险
- Oracle 可以任意修改任何用户的评分
- 私钥泄露 = 所有用户数据被篡改
- 单点故障

### 改进方案 1：评分变化限制

```solidity
// 添加常量
uint16 public constant MAX_SCORE_CHANGE_PER_UPDATE = 100; // 单次最多变化±100分
uint32 public constant MIN_UPDATE_INTERVAL = 1 hours; // 最小更新间隔

// 修改 updateCreditScore 函数
function updateCreditScore(
    address user,
    uint16 keystone,
    uint16 ability,
    uint16 wealth,
    uint16 health,
    uint16 behavior
) external onlyRole(ORACLE_ROLE) {
    require(user != address(0), "Invalid user address");
    require(keystone <= 1000 && ability <= 1000 && wealth <= 1000 
            && health <= 1000 && behavior <= 1000, "Score out of range");

    CreditScore storage score = userScores[user];
    
    // 检查更新间隔
    require(
        block.timestamp >= score.lastUpdate + MIN_UPDATE_INTERVAL,
        "Update too frequent"
    );
    
    // 检查评分变化幅度
    if (score.lastUpdate > 0) { // 不是首次更新
        require(
            _abs(int16(keystone) - int16(score.keystone)) <= MAX_SCORE_CHANGE_PER_UPDATE,
            "Keystone change too large"
        );
        require(
            _abs(int16(ability) - int16(score.ability)) <= MAX_SCORE_CHANGE_PER_UPDATE,
            "Ability change too large"
        );
        require(
            _abs(int16(wealth) - int16(score.wealth)) <= MAX_SCORE_CHANGE_PER_UPDATE,
            "Wealth change too large"
        );
        require(
            _abs(int16(health) - int16(score.health)) <= MAX_SCORE_CHANGE_PER_UPDATE,
            "Health change too large"
        );
        require(
            _abs(int16(behavior) - int16(score.behavior)) <= MAX_SCORE_CHANGE_PER_UPDATE,
            "Behavior change too large"
        );
    }
    
    // ... 原有逻辑
}

// 辅助函数
function _abs(int16 x) internal pure returns (uint16) {
    return x >= 0 ? uint16(x) : uint16(-x);
}

// 紧急情况下可以调整限制（需要治理）
function setMaxScoreChange(uint16 newMax) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(newMax <= 500, "Max change too large");
    MAX_SCORE_CHANGE_PER_UPDATE = newMax;
}
```

### 改进方案 2：多签 Oracle

```solidity
// 使用 Gnosis Safe 或类似多签钱包作为 Oracle
// 部署时将 ORACLE_ROLE 授予多签合约地址

// 示例部署脚本
const gnosisSafe = "0x..."; // 多签钱包地址
await dynamicSBTAgent.grantRole(ORACLE_ROLE, gnosisSafe);
```

### 改进方案 3：延时执行（TimeLock）

```solidity
import "@openzeppelin/contracts/governance/TimelockController.sol";

// 部署时配置
const timelock = await TimelockController.deploy(
    3600, // 1小时延时
    [oracle], // proposers
    [oracle], // executors
    admin
);

await dynamicSBTAgent.grantRole(ORACLE_ROLE, timelock.address);
```

---

## 2. 缺少历史记录问题

### 当前风险
- 无法追溯评分变化
- 无法检测异常
- 无法回滚错误

### 改进方案：评分历史数组

```solidity
// 历史记录结构
struct ScoreSnapshot {
    uint16 keystone;
    uint16 ability;
    uint16 wealth;
    uint16 health;
    uint16 behavior;
    uint32 timestamp;
    address updater;
}

// 存储
mapping(address => ScoreSnapshot[]) public scoreHistory;
uint8 public constant MAX_HISTORY_LENGTH = 10;

// 修改 updateCreditScore
function updateCreditScore(...) external onlyRole(ORACLE_ROLE) {
    // ... 验证逻辑
    
    CreditScore storage score = userScores[user];
    
    // 保存历史快照
    _saveHistory(user, score, msg.sender);
    
    // 更新评分
    score.keystone = keystone;
    // ...
}

function _saveHistory(
    address user,
    CreditScore memory score,
    address updater
) internal {
    ScoreSnapshot[] storage history = scoreHistory[user];
    
    // 如果达到上限，删除最旧的记录
    if (history.length >= MAX_HISTORY_LENGTH) {
        for (uint i = 0; i < MAX_HISTORY_LENGTH - 1; i++) {
            history[i] = history[i + 1];
        }
        history.pop();
    }
    
    // 添加新记录
    history.push(ScoreSnapshot({
        keystone: score.keystone,
        ability: score.ability,
        wealth: score.wealth,
        health: score.health,
        behavior: score.behavior,
        timestamp: uint32(block.timestamp),
        updater: updater
    }));
}

// 查询历史
function getScoreHistory(address user) external view returns (ScoreSnapshot[] memory) {
    return scoreHistory[user];
}

// 回滚到上一个版本（仅管理员）
function rollbackScore(address user) external onlyRole(DEFAULT_ADMIN_ROLE) {
    ScoreSnapshot[] storage history = scoreHistory[user];
    require(history.length > 0, "No history to rollback");
    
    ScoreSnapshot memory lastSnapshot = history[history.length - 1];
    CreditScore storage score = userScores[user];
    
    score.keystone = lastSnapshot.keystone;
    score.ability = lastSnapshot.ability;
    score.wealth = lastSnapshot.wealth;
    score.health = lastSnapshot.health;
    score.behavior = lastSnapshot.behavior;
    
    emit ScoreRolledBack(user, lastSnapshot.timestamp);
}

event ScoreRolledBack(address indexed user, uint32 originalTimestamp);
```

---

## 3. registerSBT 一次性限制问题

### 当前问题
用户只能注册一个 SBT，销毁后无法重新注册。

### 改进方案

```solidity
function registerSBT(address user, uint256 tokenId) 
    external 
    onlyRole(UPDATER_ROLE) 
{
    // 允许覆盖旧的 tokenId
    uint256 oldTokenId = userTokenIds[user];
    if (oldTokenId != 0) {
        // 清理旧映射
        delete tokenOwners[oldTokenId];
        emit SBTUnregistered(user, oldTokenId);
    }
    
    // 注册新 tokenId
    tokenOwners[tokenId] = user;
    userTokenIds[user] = tokenId;

    // 初始化默认评分（如果尚未初始化）
    if (userScores[user].lastUpdate == 0) {
        userScores[user] = CreditScore({
            keystone: 500,
            ability: 500,
            wealth: 500,
            health: 500,
            behavior: 500,
            lastUpdate: uint32(block.timestamp),
            updateCount: 0
        });
    }
    
    emit SBTRegistered(user, tokenId);
}

// 添加取消注册功能
function unregisterSBT(address user) external onlyRole(UPDATER_ROLE) {
    uint256 tokenId = userTokenIds[user];
    require(tokenId != 0, "No SBT registered");
    
    delete tokenOwners[tokenId];
    delete userTokenIds[user];
    
    emit SBTUnregistered(user, tokenId);
}

event SBTRegistered(address indexed user, uint256 indexed tokenId);
event SBTUnregistered(address indexed user, uint256 indexed tokenId);
```

---

## 4. Gas 优化建议

### 批量更新 Gas 限制

```solidity
function batchUpdateCreditScores(...) external onlyRole(ORACLE_ROLE) {
    require(users.length <= 50, "Batch size too large"); // 防止 Gas 耗尽
    require(users.length == keystones.length, "Length mismatch");
    // ...
}
```

### Packed Storage 优化

```solidity
// 当前：5个 uint16 + 2个 uint32 = 10+8 = 18 bytes = 1 slot (不够) -> 2 slots
// 可以打包到 uint256（32 bytes = 1 slot）

// 方案：使用位操作打包
uint256 packedScore; // 存储所有数据

// 编码（5个10-bit + 1个32-bit timestamp + 1个32-bit count = 114 bits < 256 bits）
function _packScore(CreditScore memory score) internal pure returns (uint256) {
    return uint256(score.keystone) |
           (uint256(score.ability) << 10) |
           (uint256(score.wealth) << 20) |
           (uint256(score.health) << 30) |
           (uint256(score.behavior) << 40) |
           (uint256(score.lastUpdate) << 50) |
           (uint256(score.updateCount) << 82);
}

// 解码
function _unpackScore(uint256 packed) internal pure returns (CreditScore memory) {
    return CreditScore({
        keystone: uint16(packed & 0x3FF),
        ability: uint16((packed >> 10) & 0x3FF),
        wealth: uint16((packed >> 20) & 0x3FF),
        health: uint16((packed >> 30) & 0x3FF),
        behavior: uint16((packed >> 40) & 0x3FF),
        lastUpdate: uint32((packed >> 50) & 0xFFFFFFFF),
        updateCount: uint32((packed >> 82) & 0xFFFFFFFF)
    });
}
```

---

## 5. 链上元数据优化

### 当前问题
- 每次调用 `generateMetadata()` 都执行大量字符串拼接和 Base64 编码
- Gas 消耗高
- OpenSea 等市场可能超时

### 改进方案 1：链下元数据服务

```solidity
// 返回指向 API 的 URL
function generateMetadata(address user, uint256 tokenId) 
    public 
    view 
    returns (string memory) 
{
    return string(abi.encodePacked(
        "https://api.credinet.xyz/metadata/",
        tokenId.toString()
    ));
}
```

**后端 API 实现：**
```typescript
// GET /api/metadata/:tokenId
app.get('/metadata/:tokenId', async (req, res) => {
  const { tokenId } = req.params;
  
  // 从合约读取数据
  const owner = await sbtContract.ownerOf(tokenId);
  const creditInfo = await agentContract.getUserCreditInfo(owner);
  
  // 生成 JSON
  const metadata = {
    name: `CrediNet Badge #${tokenId}`,
    description: "Dynamic Soulbound Token...",
    image: getImageUrl(creditInfo.rarity),
    attributes: [
      { trait_type: "C-Score", value: creditInfo.totalScore, display_type: "number" },
      // ...
    ]
  };
  
  res.json(metadata);
});
```

### 改进方案 2：事件监听 + 缓存

```typescript
// 后端监听 SBTMetadataUpdated 事件
agent.on('SBTMetadataUpdated', async (tokenId, newMetadataURI, rarity) => {
  // 缓存到 Redis/数据库
  await cache.set(`metadata:${tokenId}`, newMetadataURI);
});

// API 从缓存读取
app.get('/metadata/:tokenId', async (req, res) => {
  const cached = await cache.get(`metadata:${req.params.tokenId}`);
  if (cached) {
    res.send(cached); // 直接返回 base64 JSON
  } else {
    // 回退到链上读取
  }
});
```

---

## 6. 部署清单

### 1. 部署 DynamicSBTAgent
```bash
npx hardhat run scripts/deploy-agent.js --network sepolia
```

### 2. 配置多签 Oracle
```bash
# 创建 Gnosis Safe
# 授予 ORACLE_ROLE 给多签地址
await agent.grantRole(ORACLE_ROLE, gnosisSafeAddress);
```

### 3. 部署 CrediNetSBT 并绑定 Agent
```bash
npx hardhat run scripts/deploy-sbt-with-agent.js --network sepolia
```

### 4. 配置 Agent Service
```bash
cd agent-service
cp .env.example .env
# 填写合约地址和私钥
npm start
```

### 5. 上传 SBT 图片到 IPFS
```bash
# 使用 Pinata 或 nft.storage
ipfs add legendary.svg
# 更新 _getImageUrl() 中的哈希
```

---

## 7. 测试清单

- [ ] Oracle 权限测试
- [ ] 评分变化限制测试
- [ ] 历史记录保存和回滚测试
- [ ] registerSBT 覆盖测试
- [ ] tokenURI 回退逻辑测试
- [ ] Gas 消耗测试
- [ ] 前端集成测试
- [ ] Agent Service 集成测试

---

## 8. 监控建议

### 链上监控
```typescript
// 监听异常评分变化
agent.on('ScoreUpdated', (user, tokenId, ...scores, totalScore) => {
  if (totalScore < 100 || totalScore > 1000) {
    alert('Abnormal score detected!');
  }
});
```

### 定期审计
- 每周检查 Oracle 地址的交易记录
- 监控评分分布是否异常
- 检查是否有大量短时间内的评分变化

---

**实施建议：**
1. 优先实施：评分变化限制、历史记录
2. 中期实施：多签 Oracle、链下元数据
3. 长期优化：Packed Storage、监控系统

**预计工作量：**
- P0 (评分限制 + 历史): 2-3 天
- P1 (多签 + 链下): 3-5 天
- P2 (优化): 2-3 天
- **总计**: 7-11 天


