# ethshanghai--Life++-CAI-ERC-8004-Security-Verification-Framework


# CAI × ERC-8004 Security & Verification Framework  
*A Standardized Security, Trust, and Accountability Architecture for Autonomous Agents and AHIN Transactions*  

---

## 1. Abstract（摘要）

本白皮书提出一套面向 **CAI（Causal-chain-reconstructing Augmented Individuality）协作智能体** 与 **AHIN（Active Hash Interaction Network）协议** 的安全验证框架。  
通过引入 **ERC-8004** 可验证凭证标准（Mandate / Intent / Cart / Payment / Audit Bundle），实现从**意图到支付**的全链路可验证性。  
框架聚焦于 *授权、真实性、问责性* 三个维度，防止资金滥用、身份伪造、隐私泄露与交易否认，为未来“AI 自主经济体”提供可信执行基座。

---

## 2. Scope & Goals（审核目标）

**目标：**
- 保证 CAI 协作 Agent + AHIN 协议在 *授权 / 真实性 / 问责性* 三个维度上具备可验证性。  
- 防止以下风险：资金滥用、身份伪造、隐私泄露、日志篡改、支付欺诈。  
- 框架可直接集成至开源社区的 PR 审核、CI/CD 流程、安全测试与合规审计。

---

## 3. Assets（关键资产）

| 分类 | 描述 |
|------|------|
| 用户标识 | DID、公钥 |
| 授权凭证 | Mandate VC, Intent VC, Cart VC, Payment Receipt |
| Agent 行为 | 签名记录、操作日志 |
| 交互链 | AHIN 哈希链、锚定点 |
| 信任指标 | ChainRank 信任分数 |
| 支付凭证 | 稳定币支付密钥、provider-signed receipt |
| 审计存证 | Signed Audit Bundle（含 Merkle Root 与锚定证明） |

---

## 4. Threat Model（威胁模型）

### 4.1 STRIDE 映射

| 威胁类型 | 描述 | 防御措施 |
|-----------|------|-----------|
| Spoofing | 伪造用户/Agent/商户 | 强身份验证（DID + VC） |
| Tampering | 篡改购物车、哈希链、ChainRank 分数 | 全链签名 + Merkle Anchoring |
| Repudiation | 否认已授权交易 | 签名 + 审计存证（Signed Audit Bundle） |
| Information Disclosure | 泄露支付或意图数据 | ZKP + 选择性披露 |
| DoS | 恶意 Agent 滥用预算/批量下单 | sandbox + 配额控制 |
| Elevation of Privilege | 越权执行高额交易 | 条件化授权 + 动态 revocation |

---

### 4.2 Threat Model 图

          +----------------------+
          |   User / DID Holder  |
          +----------+-----------+
                     |
                     v
       +-------------+--------------+
       |   CAI Agent (Mandate VC)   |
       +-------------+--------------+
                     |
                     v
       +-------------+--------------+
       |  AHIN Chain (Intent VC)    |
       +-------------+--------------+
                     |
                     v
       +-------------+--------------+
       | Cart VC → Payment VC → Receipt |
       +-------------+--------------+
                     |
                     v
       +-------------+--------------+
       | Signed Audit Bundle (On-chain Anchor) |
       +---------------------------------------+


---

## 5. Security Requirements（安全需求）

1. **强身份与可验证凭证**：  
 使用 DID + VC，全链签名认证。

2. **条件化授权**：  
 支持预算、时间窗、白名单、风险级别。

3. **链式不可篡改结构**：  
 Intent → Cart → Payment → Receipt 全链签名并哈希锚定。

4. **不可否认性**：  
 所有关键操作均签名并生成审计记录。

5. **隐私保护**：  
 ZKP + 选择性披露 + 脱敏日志。

6. **支付绑定性**：  
 cart_hash ↔ payment_token 强绑定。

7. **审计追溯性**：  
 日志 → Merkle root → 链上锚定。

---

## 6. Controls（控制措施）

### 6.1 协议层
- 定义标准化 VC Schema（Mandate / Intent / Cart / Payment / Audit）。
- AHIN 交互格式：`prev_hash + signature + timestamp`。
- 定期锚定 Merkle Root 至公链（L2/L3）。

### 6.2 Agent 层
- 运行于 sandbox + 预算配额控制。
- 验证 Mandate 与 Intent 约束。
- 支持 Revocation Registry（实时撤销）。

### 6.3 支付层
- cart_hash ↔ payment_token 绑定。  
- provider-signed receipt 返回。  
- 检测双重支付 / 重放攻击。

### 6.4 身份与凭证
- DID 注册 + 撤销支持。  
- 签名算法：Ed25519 / ECDSA / MPC。  
- 凭证最小化披露。

### 6.5 日志与审计链
- 每次交互生成 signed record。  
- 定期导出 Signed Audit Bundle。  
- 脱敏后用于合规审计或外部验证。

### 6.6 治理
- 仲裁流程定义：证据提交、SLA、责任分配。  
- ChainRank 与合规评分结合，动态调整风险权重。

---

## 7. VC Schema（凭证结构示例）

### 7.1 Mandate VC
| 字段 | 类型 | 描述 |
|------|------|------|
| `mandate_id` | UUID | 唯一标识 |
| `issuer_did` | DID | 授权方 |
| `agent_did` | DID | 被授权代理 |
| `scope` | JSON | 授权范围 |
| `constraints` | JSON | 预算、时间窗、白名单等 |
| `signature` | Ed25519 | 授权签名 |

---

### 7.2 Cart VC
| 字段 | 类型 | 描述 |
|------|------|------|
| `cart_id` | UUID | 唯一标识 |
| `items` | Array | 商品/服务列表 |
| `total_value` | Number | 总金额 |
| `cart_hash` | SHA256 | 哈希绑定值 |
| `prev_intent_hash` | Hash | 链式引用 |
| `agent_signature` | ECDSA | 购物车签名 |

---

### 7.3 Payment VC
| 字段 | 类型 | 描述 |
|------|------|------|
| `payment_id` | UUID | 唯一标识 |
| `cart_hash` | Hash | 对应购物车哈希 |
| `payment_token` | Address | 支付资产地址 |
| `provider_receipt` | JSON | 支付网关签名凭证 |
| `anchor_tx_hash` | Hash | 公链锚定交易哈希 |
| `timestamp` | Time | 执行时间 |

---

## 8. Audit Process（审计流程）

### 8.1 流程概览图

┌────────────────────────────┐
│   Design Audit (Schema)    │
└────────────┬───────────────┘
             │
┌────────────v───────────────┐
│ Implementation Review (CI) │
└────────────┬───────────────┘
             │
┌────────────v───────────────┐
│   Penetration Test (QA)    │
└────────────┬───────────────┘
             │
┌────────────v───────────────┐
│  Audit Package Generation  │
│  → Threat Model            │
│  → VC Schema               │
│  → AHIN Spec               │
│  → Test Report             │
│  → Signed Audit Bundle     │
└────────────┬───────────────┘
             │
┌────────────v───────────────┐
│ CI/CD Integration + Anchor │
└────────────────────────────┘



---

## 9. CI/CD Security Checklist（可执行安全清单）

### 设计阶段
- VC Schema 是否完整？  
- 授权是否条件化（时间窗/预算）？  
- cart_hash ↔ payment binding 是否存在？  
- revocation registry 是否定义？  
- AHIN anchoring 方案是否明确？

### 实现阶段
- 全部 API 启用 TLS/mTLS。  
- intent/cart/payment 签名路径可验证。  
- nonce + timestamp 防重放。  
- 私钥绝不写入日志。  
- 依赖库扫描（SBOM）。  
- 镜像签名与安全基线检查。

### 测试阶段
- Cart tampering：修改价格 → 签名失败。  
- Replay attack：历史交易不可重放。  
- MITM：替换支付目标 → 校验失败。  
- Agent sandbox：无法越权访问 keystore。  
- Audit bundle：敏感字段脱敏披露。

---

## 10. References（参考文献）

- ERC-8004: Agent Credential Standard Proposal  
- W3C DID & VC Data Model  
- ChainRank Trust Framework  
- CAI × AHIN Protocol Specification  
- OWASP ASVS 4.0  
- ISO/IEC 27001:2022  

---

## 附录 A：与 PayPal / AP2 的对齐性

随着 Google 发布 **AP2 协议** 并联手 PayPal 推出 **AI 自动下单标准**，本框架与之在安全意图验证、支付凭证标准化及 agent 执行授权路径上完全兼容。  
CAI × ERC-8004 可作为 AP2 的安全扩展层，实现「AI → 支付 → 审计 → 问责」全生命周期闭环。
