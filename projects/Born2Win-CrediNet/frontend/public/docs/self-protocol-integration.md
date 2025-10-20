
**CrediNet × Self.Protocol **说明书与集成介绍

目标链：以太坊主网 & Base（登录/风控离链校验）

# **目录**

1. 项目背景与协议总览
2. 核心概念与术语（Passport Proof、Selective Disclosure、Attributes、Proof、Session）
3. 集成路线选择（前端 QRCode × 后端校验｜链上校验可选 Celo）
4. CrediNet 登陆与数据流（与 World ID 分离存储）
5. 开发准备与环境配置
6. 前端集成（React：@selfxyz/qrcode）
7. 后端校验（Node：@selfxyz/core；Rust 伪代码）
8. （可选）链上集成：Celo On‑Chain Verifier 与合约示例
9. CrediNet 数据模型与存储建议
10. 安全设计与合规模块（隐私/去重/时效/风控）
11. 常见错误与排查
12. 配置清单（.env 示例）
13. 版本策略与变更记录
14. 参考资料

# **1. 项目背景与协议总览**

Self 是一个隐私优先、开源的身份协议，基于零知识证明（ZK）在不暴露个人信息的情况下完成身份与属性校验，支持“选择性披露”（如仅证明年龄区间、国家来源、是否非制裁名单等），帮助应用实现更强的女巫抵抗（Sybil Resistance）。

对于 CrediNet：我们将使用 Self 完成“隐私登录与风控”，并与 World ID 的人机唯一性证明分离存储。登录态与内部 UID 建立绑定，但不持有任何可识别个人信息（PII）。

# **2. 核心概念与术语**

• Passport Proof：基于电子护照/NFC 等来源生成的零知识证明，用于选择性披露年龄/国家等属性。

• Selective Disclosure（选择性披露）：只证明所需属性，而不泄露原始证件数据。

• Attributes（属性）：如 age_over_18、country=US、not_in_OFAC 等。

• Proof（证明包）：前端触发后，由 Self App 生成并回传；后端或链上验证其有效性、签发方与时间窗。

• Session（会话）：CrediNet 后端在校验通过后颁发的登录态（JWT/Session），与内部 UID 绑定。

# **3. 集成路线选择**

• 推荐路径：前端二维码 + 后端离链校验（适用于以太坊主网/Base 的登录与风控）。

• 可选链上路径：在 Celo 上使用 Self 的 On‑Chain SDK 与已部署合约进行验证；适合需要合约级门槛的场景（如空投/治理）。

• 说明：截至当前版本，Self 的官方链上 SDK/部署地址主要在 Celo（主网/测试网）；以太坊与 Base 建议采用离链校验 + 业务门槛控制。

# **4. 体系架构与登录数据流（CrediNet）**

步骤：

1) 前端（Web/React）引入 @selfxyz/qrcode 组件，生成二维码（包含 app 信息与所需披露属性）。
2) 用户使用 Self App 扫码并在本地生成零知识证明（Proof），返回到前端回调 → 发送到后端。
3) 后端调用 @selfxyz/core 对 Proof 做离链校验（签名/时间窗/属性满足）。
4) 校验通过 → 颁发 CrediNet 登录态（JWT/Session），并记录匿名化字段（不存原始证件信息）。
5) （可选）若需链上门槛（如 Celo 空投），前端将校验结果用于调用合约，在链上完成二次校验。

# **5. 开发准备与环境配置**

• 注册/配置 Self 开发者信息与应用标识（App ID / Project ID）。

• 前端安装：npm i @selfxyz/qrcode（二维码组件）

• 后端安装：npm i @selfxyz/core（证明校验 SDK）

• （可选）链上：准备 Celo 钱包/节点与 Self 已部署合约地址（主网/测试网）。

# **6. 前端集成（React：@selfxyz/qrcode）**

示例：请求用户披露“年满 18 岁 + 非制裁名单 + 国家在白名单内”，并将结果发送后端校验：

import { SelfQRcode } from '@selfxyz/qrcode'
import { useState } from 'react'

export default function SelfLogin() {
  const [requestId, setRequestId] = useState(null)

  const onProof = async (proof) => {
    // proof: 来自 Self App 的零知识证明包（已包含所需属性的选择性披露）
    const r = await fetch('/api/auth/self/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof, requestId })
    })
    const data = await r.json()
    if (data.ok) {
      // 登录成功，进入应用逻辑
    } else {
      // 显示错误
    }
  }

  return (
    `<div>`
      <SelfQRcode
        appId={process.env.NEXT_PUBLIC_SELF_APP_ID}
        attributes={[
          { key: 'age_over', value: 18 },
          { key: 'not_in_sanctions', value: true },
          { key: 'country_in', value: ['US','DE','FR','SG','TW'] }
        ]}
        onReady={(rid) => setRequestId(rid)}   // 组件生成的请求ID
        onProof={onProof}                      // 拿到 proof 回调
      />
    `</div>`
  )
}

# **7. 后端校验（Cloud/离链）**

Node（Express）示例：使用 @selfxyz/core 校验 Proof 与属性约束：

import express from 'express'
import { verifyPassportProof } from '@selfxyz/core' // 实际方法名以官方 SDK 为准
const app = express()
app.use(express.json())

app.post('/api/auth/self/verify', async (req, res) => {
  try {
    const { proof, requestId } = req.body
    // 校验 proof（签名、时间窗、防重放）并验证属性是否满足业务需求
    const result = await verifyPassportProof({
      proof,
      requestId,
      required: {
        age_over: 18,
        not_in_sanctions: true,
        country_in: ['US','DE','FR','SG','TW']
      }
    })
    if (result.valid) {
      // 绑定 CrediNet 内部 UID，签发会话/JWT；仅记录匿名化字段/哈希
      return res.json({ ok: true, attested: result.attested })
    }
    return res.status(400).json({ ok: false, error: 'verify_failed', detail: result.reason })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server_error', detail: String(e) })
  }
})

app.listen(3000, () => console.log('CrediNet Self auth server up on :3000'))

Rust（伪代码）：调用后端 SDK/HTTP 服务完成校验：

// use reqwest + serde
#[derive(serde::Serialize)]
struct VerifyReq<'a> {
    proof: serde_json::Value,
    requestId: &'a str,
}

#[derive(serde::Deserialize)]
struct VerifyResp {
    ok: bool,
    attested: Option[serde_json::Value](serde_json::Value),
}

async fn verify_self_offchain(proof: serde_json::Value, request_id: &str) -> anyhow::Result`<bool>` {
    let resp = reqwest::Client::new()
        .post("https://credinet.example.com/api/auth/self/verify")
        .json(&VerifyReq { proof, requestId: request_id })
        .send().await?;
    let data: VerifyResp = resp.json().await?;
    Ok(data.ok)
}

# **8. 链上集成（可选，Celo）**

• 官方 On‑Chain SDK 与合约部署目前以 Celo 为主；如果需要“合约级门槛”（如空投防女巫、合规限制），建议在 Celo 完成链上校验。

• 以太坊/Base 的合约若需要使用 Self 校验结果，可通过：① 后端允许名单铸造（Allowlist）；② 预先铸造通行凭证/SBT；③ 预言机/跨链消息把 Celo 校验结果同步到目标链。

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 伪接口：以官方 Self 合约接口为准
interface ISelfVerificationHub {
    function verify(
        bytes calldata proof,
        bytes32 requestId,
        bytes32[] calldata requiredAttributes // 例如：keccak256('age_over:18'), keccak256('not_in_sanctions:true')
    ) external returns (bool ok);
}

contract CrediNetSelfGate {
    ISelfVerificationHub public immutable hub;
    mapping(bytes32 => bool) public usedRequest; // 防重放

    constructor(address hub_) { hub = ISelfVerificationHub(hub_); }

    function verifyAndExecute(bytes calldata proof, bytes32 requestId) external {
        require(!usedRequest[requestId], "reused");
        bytes32[] memory reqAttrs = new bytes32[](2);
        reqAttrs[0] = keccak256(abi.encodePacked("age_over:18"));
        reqAttrs[1] = keccak256(abi.encodePacked("not_in_sanctions:true"));
        bool ok = hub.verify(proof, requestId, reqAttrs);
        require(ok, "invalid proof");
        usedRequest[requestId] = true;

    // TODO: 执行业务逻辑（空投/白名单/治理门槛）
    }
}

# **9. CrediNet 数据模型与存储建议**

只存匿名与最小必要信息：

• self_request_id（字符串/哈希）、proof_status（success/fail）、attested_attributes（最小集合）

• user_uid（内部ID）与 self_request_id 的关联关系（不可逆）。

• 审计字段：created_at、ip_hash、ua_hash 等。

• 绝不存储护照号、姓名、原始照片等 PII（由 Self App 本地持有/加密）。

# **10. 安全设计与合规模块**

• 防重放：服务端对 requestId 去重；链上路径需在合约记录已用的 requestId。

• 属性白名单：所有业务属性在后端/合约端硬编码或白名单配置，防止前端篡改。

• 时效控制：Proof 有效期（例如 ≤ 2h），过期需重试。

• 等级与场景：登录默认用 age_over + not_in_sanctions 等轻量属性；涉及资金/治理可叠加更严格属性。

• 合规：严格遵循“选择性披露、最小化存储、不接触原始证件数据”的原则。

# **11. 常见错误与排查**

• invalid_proof：签名/时间窗/链上根不匹配；检查 SDK 版本与组件参数。

• attribute_not_satisfied：用户不满足年龄/国家等条件；前端需给出清晰提示。

• request_reused：同一 requestId 被重复使用；检查后端/合约的去重逻辑。

• network_mismatch：链上校验网络与部署地址不一致（仅 Celo 路径）。

# **12. 配置清单（.env 示例）**

# Frontend

NEXT_PUBLIC_SELF_APP_ID=app_xxxxxxxxxxxxx

# Backend

SELF_PROJECT_ID=proj_xxxxxxxxxxxxx
SELF_API_BASE=https://api.self.xyz

# **13. 版本策略与变更记录**

• 使用 @selfxyz/qrcode（前端）与 @selfxyz/core（后端）当前稳定版本；如需链上，请参考 Celo 部署地址与合约基类。

• 定期回归测试：属性语义/枚举可能调整；请固定次要版本并设置 CI。

# **14. 参考资料**

• Self Protocol 文档（总览）: https://docs.self.xyz/

• Quickstart（前端二维码 + 后端校验）: https://docs.self.xyz/use-self/quickstart

• QRCode SDK（@selfxyz/qrcode）: https://docs.self.xyz/frontend-integration/qrcode-sdk

• 后端 SDK（@selfxyz/core）: https://www.npmjs.com/package/@selfxyz/core

• 合约集成（基础）: https://docs.self.xyz/contract-integration/basic-integration

• 已部署合约地址（Celo）: https://docs.self.xyz/contract-integration/deployed-contracts

• Celo 官方：Build with Self: https://docs.celo.org/build-on-celo/build-with-self

• ETHGlobal（Self 奖项说明，属性示例）: https://ethglobal.com/events/cannes/prizes/self-protocol
