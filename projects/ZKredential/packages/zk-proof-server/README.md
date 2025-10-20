# ZK 证明服务器

## 📖 简介

专用的零知识证明生成和验证服务器，支持多平台（PropertyFy, RealT, RealestateIO）。

---

## 🚀 快速启动

```bash
cd zk-proof-server
node server.js
```

**服务地址**: http://127.0.0.1:8080

---

## 📁 目录结构

```
zk-proof-server/
├── server.js                     # Express 服务器
├── config/
│   └── server-config.js          # 服务器配置
├── services/
│   ├── proof-generator.js        # 证明生成器
│   └── multi-platform-proof-generator.js  # 多平台生成器
├── utils/
│   └── field-validator.js        # 字段验证器
└── circuits/
    ├── propertyfy_circuit.circom      ✅ PropertyFy 电路
    ├── realt_circuit.circom           ✅ RealT 电路
    ├── realestate_circuit.circom      ✅ RealestateIO 电路
    ├── modules/                       # 电路模块
    │   ├── kyc_verification.circom
    │   ├── asset_verification.circom
    │   └── aml_verification.circom
    ├── build/                         # 编译产物
    │   ├── propertyfy/...wasm
    │   ├── realt/...wasm
    │   └── realestate/...wasm
    ├── keys/                          # 密钥文件
    │   ├── propertyfy_final.zkey      ✅ 保留
    │   ├── realt_final.zkey           ✅ 保留
    │   ├── realestate_final.zkey      ✅ 保留
    │   ├── *_verification_key.json    ✅ 保留
    │   ├── *Verifier.sol              ✅ 保留（源文件）
    │   └── powersOfTau_final.ptau     ✅ 保留
    └── compile.sh                     # 编译脚本
```

---

## 🔌 API 端点

### POST /generate-proof
生成 ZK 证明

**请求**:
```json
{
  "zkInput": { ... },
  "platform": "propertyfy",
  "options": { "allowMockProof": true }
}
```

**响应**:
```json
{
  "success": true,
  "proof": {
    "proof": { "pi_a": [...], "pi_b": [...], "pi_c": [...] },
    "publicSignals": [12 or 16 个元素]
  },
  "platform": "propertyfy",
  "platformName": "PropertyFy",
  "modules": ["KYC", "ASSET"]
}
```

---

### POST /verify-proof
验证 ZK 证明

**请求**:
```json
{
  "proof": { ... },
  "publicSignals": [...],
  "platform": "propertyfy"
}
```

**响应**:
```json
{
  "success": true,
  "verified": true,
  "platform": "propertyfy"
}
```

---

### GET /platforms
获取支持的平台列表

**响应**:
```json
{
  "success": true,
  "platforms": [
    {
      "platform": "propertyfy",
      "name": "PropertyFy",
      "modules": ["KYC", "ASSET"],
      "publicSignalsCount": 12,
      "available": true
    },
    // ...
  ]
}
```

---

### GET /health
健康检查

---

## ⚙️ 配置

编辑 `config/server-config.js`:

```javascript
export const SERVER_CONFIG = {
  port: 8080,
  host: '127.0.0.1',
  circuits: {
    propertyfy: { ... },
    realt: { ... },
    realestate: { ... }
  }
}
```

---

## 🔧 重新编译电路

```bash
cd circuits

# 编译所有平台
circom propertyfy_circuit.circom --r1cs --wasm --sym -o build/propertyfy -l node_modules
circom realt_circuit.circom --r1cs --wasm --sym -o build/realt -l node_modules
circom realestate_circuit.circom --r1cs --wasm --sym -o build/realestate -l node_modules
```

---

## 📊 性能

| 平台 | 约束数 | 生成时间 | WASM 大小 |
|------|--------|---------|-----------|
| PropertyFy | 226 | 0.5-1.5s | 45 KB |
| RealT | 55 | 0.3-0.8s | 43 KB |
| RealestateIO | 257 | 0.8-2.0s | 49 KB |

---

**查看主文档**: [../README.md](../README.md)

