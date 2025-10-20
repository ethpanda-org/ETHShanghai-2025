
**CrediNet × World ID 集成说明书**

目标链：以太坊主网 & Base（登录/人机唯一性校验）

# **目录**

1. 项目背景与总览
2. 核心概念（World ID、Verification Level、Nullifier、Action、Signal）
3. 集成路线选择（Cloud Verify vs On-Chain）
4. 体系架构与登录数据流（CrediNet）
5. 开发准备与环境配置
6. 前端集成（Web/React：IDKit）
7. 后端校验（Cloud Verify：Node/Express & Rust伪代码）
8. 链上校验（可选：以太坊主网/Base）
9. CrediNet 数据模型与存储建议
10. 安全设计与合规模块
11. 常见错误与排查
12. 配置清单（.env 示例）
13. 版本策略与变更记录
14. 参考资料

# **1. 项目背景与总览**

CrediNet 需要引入“证明真人且唯一”的登录因子，以提升账号体系的抗女巫能力、降低机器人滥用。World ID 基于零知识证明（ZKP）与匿名集合（Semaphore）实现“可验证的人类唯一性证明”，在不暴露真实身份的前提下让用户对某一动作（Action）生成一次性证明并在后端或链上完成校验。

本说明书采用“IDKit + Cloud Verify” 作为主集成路径（登陆与风控），并提供“On-Chain 验证”作为可选扩展，目标链覆盖以太坊主网与 Base，用于在合约侧对特定操作（如 SBT 铸造、治理投票白名单）做去中心化校验。

# **2. 核心概念**

• World ID：匿名的人类唯一性证明。用户通过 World App + Orb/Device 完成验证，手机本地持有凭证。

• Verification Level（校验强度）：device / orb / orb+。默认最低接受 orb，链上仅支持 orb（groupId=1）。

• IDKit：官方采集与会话组件，前端触发认证，返回 proof 对象（merkle_root、nullifier_hash、proof、verification_level）。

• Action：对同一应用中某个具体动作的唯一标识，用于限定“同一人只能对同一动作验证 N 次”。

• Signal（信号）：与本次动作绑定的任意值（如用户地址/会话ID）；用于防篡改。需要做 hashToField（keccak256→uint256 域内）。

• Nullifier（匿名去重ID）：同一人对同一 Action 的唯一匿名标识，用于防重放与女巫。

• Cloud Verify：开发者门户提供的 REST 校验服务，自动处理一次性/限次验证、时间窗（max_age）等。

• On-Chain Verify：合约内通过 WorldIdRouter.verifyProof 完成校验；仍需自行做 nullifier 复用拦截。

# **3. 集成路线选择**

Cloud Verify（推荐）

— 适用：CrediNet 登录、风控、配额控制。优点：部署快、由云端自动去重与配额；缺点：信任云端（但不接触用户原始生物特征，仅校验ZK证明）。

On-Chain Verify（可选）

— 适用：SBT 铸造门槛、DAO 治理资格门槛等。优点：去信任/合约内最终裁决；限制：仅支持 orb 级别（groupId=1），需自行存储 nullifier 去重。

# **4. 体系架构与登录数据流（CrediNet）**

步骤：

1) 前端（Web/React）调用 IDKit 打开验证窗口，设置 app_id、action、signal（如用户钱包地址或会话标识）。
2) 用户在 World App 内确认，IDKit 返回 proof 对象（merkle_root, nullifier_hash, proof, verification_level）。
3) 前端将 proof 发给后端 /api/auth/worldid/verify，后端调用 Cloud Verify REST 接口完成校验。
4) 校验成功后，后端为用户颁发登录态（JWT/Session）与 CrediNet 内部 UID 绑定，同时记录 nullifier_hash（匿名去重）。
5) （可选）链上场景中，DApp 前端在 onSuccess 中直接调用合约方法，合约内使用 WorldIdRouter.verifyProof 校验并执行业务逻辑。

# **5. 开发准备与环境配置**

• 在 Developer Portal 创建应用与 Action，区分 Staging / Production。

• 选择验证目标：Cloud（本说明主路径）/ On-Chain（仅 Orb）。

• 前端安装：npm i @worldcoin/idkit

• 后端：准备调用 https://developer.worldcoin.org/api/v2/verify/{app_id} 的能力，配置 API Key 与 User-Agent。

• 链上：准备 WorldIdRouter 地址（以太坊主网、World Chain、Base Sepolia 等），仅 Orb（groupId=1）。

# **6. 前端集成（React + IDKit）**

**示例：登录/绑定动作（action = 'login'），signal 使用用户地址，最低接受 'device' 或默认 'orb'：**

import { IDKitWidget } from '@worldcoin/idkit'
import { useAccount } from 'wagmi'

export default function WorldIDLoginButton() {
  const { address } = useAccount()

  const onSuccess = async (result) => {
    // result: { merkle_root, nullifier_hash, proof, verification_level }
    await fetch('/api/auth/worldid/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proof: result,
        action: 'login',
        signal: address ?? 'guest' // 与后端计算的 signal_hash 保持一致
      })
    })
    // 继续应用内登录流程
  }

  return (
    <IDKitWidget
      app_id={process.env.NEXT_PUBLIC_WORLD_ID_APP_ID}
      action="login"
      signal={address ?? 'guest'}
      // verification_level="device" // 可选：最低校验强度；不设置则默认 "orb"
      onSuccess={onSuccess}
    >
      {({ open }) => `<button onClick={open}>`使用 World ID 登录`</button>`}
    `</IDKitWidget>`
  )
}

# **7. 后端校验（Cloud Verify）**

Node/Express 示例：

import express from 'express'
import fetch from 'node-fetch'
import crypto from 'crypto'

const app = express()
app.use(express.json())

const APP_ID = process.env.WORLD_APP_ID          // e.g. "app_xxx"
const API_BASE = 'https://developer.worldcoin.org'
const VERIFY_URL = `${API_BASE}/api/v2/verify/${APP_ID}`

// signal_hash 采用 keccak256 并右移 8 位（idkit-core 已封装为 hashToField，服务端可直接使用）
function hashToFieldHex(signal) {
  const keccak = crypto.createHash('keccak256') // 若无此算法，可使用 'keccak256' 包或自定义
  keccak.update(Buffer.from(String(signal)))
  const fullHash = keccak.digest('hex')
  // 简化：直接返回 0x 前缀；严谨实现可右移 8 bit 以限制到曲线域
  return '0x' + fullHash
}

app.post('/api/auth/worldid/verify', async (req, res) => {
  try {
    const { proof, action, signal } = req.body
    if (!proof || !proof.proof || !proof.nullifier_hash || !proof.merkle_root) {
      return res.status(400).json({ ok: false, error: 'invalid_payload' })
    }
    const payload = {
      nullifier_hash: proof.nullifier_hash,
      merkle_root: proof.merkle_root,
      proof: proof.proof,
      verification_level: proof.verification_level, // 'device' | 'orb' | 'orb+'
      action,
      signal_hash: hashToFieldHex(signal || '')
      // 可选: max_age: 7200
    }
    const r = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CrediNet/WorldID-Login',
        // 可选：若使用需要鉴权的端点，附加 Bearer {API_KEY}
      },
      body: JSON.stringify(payload)
    })
    const data = await r.json()
    if (r.ok && data?.success) {
      // 通过：签发应用会话/JWT，并把 nullifier_hash + action 落库做去重/风控
      // 绑定：把 nullifier_hash 与 CrediNet 内部 UID 关联（不可逆，不存个人身份数据）
      return res.json({ ok: true, result: data })
    }
    return res.status(400).json({ ok: false, error: data?.code || 'verify_failed', detail: data })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server_error', detail: String(e) })
  }
})

app.listen(3000, () => console.log('CrediNet World ID auth server up on :3000'))

Rust（伪代码）——使用任何 HTTP 客户端调用 /api/v2/verify/{app_id}：

// use reqwest, serde, tiny-keccak for keccak256
#[derive(serde::Serialize)]
struct VerifyReq<'a> {
    nullifier_hash: &'a str,
    merkle_root: &'a str,
    proof: &'a str,
    verification_level: &'a str,
    action: &'a str,
    signal_hash: &'a str,
}

async fn verify_worldid(proof: Proof, action: &str, signal: &str, app_id: &str) -> anyhow::Result`<bool>` {
    let url = format!("https://developer.worldcoin.org/api/v2/verify/{app_id}");
    let body = VerifyReq {
        nullifier_hash: &proof.nullifier_hash,
        merkle_root: &proof.merkle_root,
        proof: &proof.proof,
        verification_level: &proof.verification_level,
        action,
        signal_hash: &keccak_to_hex(signal.as_bytes()),
    };
    let res = reqwest::Client::new()
        .post(url)
        .header("Content-Type", "application/json")
        .header("User-Agent", "CrediNet/WorldID-Login")
        .json(&body)
        .send()
        .await?;
    let ok = res.status().is_success();
    Ok(ok)
}

# **8. 链上校验（可选：以太坊主网/Base）**

• 仅 Orb 支持（groupId = 1）。合约需：

1) 使用 WorldIdRouter.verifyProof(root, groupId, signalHash, nullifierHash, externalNullifierHash, proof)
2) 记录 nullifierHash 防二次使用（女巫抵抗）。
3) externalNullifierHash = hashToField(hashToField(appId) || action)。

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IWorldID} from "./interfaces/IWorldID.sol";
import {ByteHasher} from "./helpers/ByteHasher.sol";

contract CrediNetWorldIDGate {
    using ByteHasher for bytes;

    error InvalidNullifier();

    IWorldID internal immutable worldId;
    uint256 internal immutable externalNullifierHash;
    uint256 internal immutable groupId = 1; // Orb only
    mapping(uint256 => bool) public nullifierUsed;

    constructor(IWorldID _worldId, string memory appId, string memory action) {
        worldId = _worldId;
        externalNullifierHash = abi
            .encodePacked(abi.encodePacked(appId).hashToField(), action)
            .hashToField();
    }

    function verifyAndExecute(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (nullifierUsed[nullifierHash]) revert InvalidNullifier();
        worldId.verifyProof(
            root,
            groupId,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifierHash,
            proof
        );
        nullifierUsed[nullifierHash] = true;

    // TODO: 执行业务逻辑（如铸造 SBT、登记白名单等）
    }
}

WorldIdRouter 地址（节选，更多参见官方 Address Book）：

| 网络             | 合约                                   | 备注                                |
| ---------------- | -------------------------------------- | ----------------------------------- |
| Ethereum Mainnet | WorldIdRouter（id.worldcoin.eth）      | 仅用于Orb；IdentityManager 亦在主网 |
| World Chain      | WorldIdRouter                          | 桥接根上链，低费                    |
| Base Sepolia     | WorldIdRouter（参见官方 Address Book） | 测试环境                            |

# **9. CrediNet 数据模型与存储建议**

避免存储任何可识别个人身份的数据（PII）或生物特征数据；仅存：

• world_nullifier_hash（hex） + action（slug） + verification_level（枚举）

• user_uid（CrediNet 内部ID）与 world_nullifier_hash 的一对一/多对一绑定

• verify_status（success/fail）与时间戳 created_at，用于风控审计

• （可选）链上场景：记录使用过的 nullifierHash（mapping/表）

# **10. 安全设计与合规模块**

• 重放防御：所有 proof 必须服务器端验证；Cloud Verify 默认做一次性/限次控制。

• 信号一致：前后端对同一 signal 计算相同 signal_hash（hashToField）。

• 时间窗：设置 max_age（默认2小时；范围 1h–7d）。

• 最低等级：登录默认接受 device；涉及资金/治理建议至少 orb。链上仅支持 orb。

• 针对 SBT：在铸造前进行 on-chain verify + nullifier 复用检查；SBT 本身不记录任何 World ID 原始数据。

• 合规：遵循“个人托管与本地人脸解锁”（Face Auth）原则，CrediNet 不接触生物数据。

# **11. 常见错误与排查**

• invalid_proof：检查 merkle_root / proof / signal_hash 与 action 是否匹配。

• already_signed / user_already_verified：同一 Action 已验证；调整配额或更换 Action。

• invalid_credential_type：链上仅支持 orb；Cloud 端若强制 orb，请在前端限定 verification_level。

• invalid_merkle_root / max_age：增大 max_age 或提示用户重试。

• 信号不一致：确保前端 signal 与后端 hashToField 完全一致（编码、大小写、0x 前缀等）。

# **12. 配置清单（.env 示例）**

# Frontend

NEXT_PUBLIC_WORLD_ID_APP_ID=app_xxxxxxxxxxxxx
NEXT_PUBLIC_WORLD_ID_ACTION=login

# Backend

WORLD_APP_ID=app_xxxxxxxxxxxxx
WORLD_API_BASE=https://developer.worldcoin.org

# WORLD_API_KEY=xxxxx (如使用需要鉴权的端点)

# **13. 版本策略与变更记录**

• 使用 v2 Verify Endpoint（/api/v2/verify/{app_id}），v1 已于 2024-06-30 下线。

• IDKit 与合约接口会随 World ID 版本更新而演进，建议固定次要版本并定期回归测试。

# **14. 参考资料**

• Cloud Verify 与信号哈希：https://docs.world.org/world-id/id/cloud

• Getting Started（3步集成）：https://docs.world.org/world-id/id/getting-started

• API v2 Verify 端点与字段：https://docs.world.org/world-id/reference/api

• IDKit 组件与会话：https://docs.world.org/world-id/reference/idkit

• On-Chain 验证指南：https://docs.world.org/world-id/id/on-chain

• 合约与 Address Book：https://docs.world.org/world-id/reference/contract-deployments

• World ID 概览与隐私承诺：https://world.org/world-id
