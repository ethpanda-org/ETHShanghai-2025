# Luminial Scripts 使用说明

本目录包含一系列实用脚本，用于管理 Luminial Privacy AMM 项目。

## 📜 脚本列表

### 1. `generate-viewing-key.sh` - 生成查看密钥

**用途：** 生成安全的随机 viewing key，用于状态服务认证

**使用方法：**

```bash
# 基本用法：生成密钥
./scripts/generate-viewing-key.sh

# 交互式选择配置位置：
#   1) Local development (.env.local)      - 本地开发
#   2) State service (.env for backend)    - 后端状态服务
#   3) Production (.env.production)        - 生产环境
#   4) Just show me the key               - 仅显示密钥
```

**输出示例：**

```
🔑 Luminial Viewing Key Generator

✅ Generated Viewing Key:

  yJZ8x1mK9vP2nQ3rT4uV5wX6yA7zB8cC9dD0eE1fF2g=

Where do you want to use this key?
  1) Local development (.env.local)
  2) State service (.env for backend)
  3) Production (.env.production)
  4) Just show me the key (manual configuration)

Choose [1-4]: 1

✅ Added to client/.env.local
```

**场景说明：**

- **选项 1（推荐）：** 自动更新 `client/.env.local`，适合本地开发
- **选项 2：** 创建 `state-service/.env`，用于后端服务
- **选项 3：** 创建 `client/.env.production`，用于生产部署
- **选项 4：** 仅显示密钥，手动配置

---

### 2. `compute-commitment.js` - 计算池子承诺

**用途：** 使用 Poseidon 哈希计算池子状态的承诺值

**前提：** 需要先安装依赖
```bash
cd client
npm install
```

**使用方法：**

```bash
# 1. 计算默认初始状态（10 ETH, 20k USDC）
node scripts/compute-commitment.js

# 2. 计算自定义状态
node scripts/compute-commitment.js \
  --reserve0 100 \
  --reserve1 200000 \
  --nonce 1 \
  --fee 3000000000000000

# 3. 验证链上 commitment 对应的状态
node scripts/compute-commitment.js \
  --check 0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1
```

**输出示例：**

```
🔐 Poseidon Commitment Calculator

📊 Input Pool State:

  reserve0 (ETH):  10 ETH
  reserve1 (USDC): 20000 USDC
  nonce:           0
  feeBps:          0
  (raw values: 10000000000000000000, 20000000000, 0, 0)

🔐 Computed Commitment:

  0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1

📋 Usage:

  Export for deployment:
    export INITIAL_COMMITMENT="0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1"

  Use in contracts:
    vault.setCommitment(0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1);
```

**验证模式示例：**

```bash
node scripts/compute-commitment.js --check 0x17596af...

# 输出：
🔍 Checking commitment: 0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1

✅ Match found!

Pool State (Default Initial):
  reserve0: 10 ETH
  reserve1: 20000 USDC
  nonce:    0
  feeBps:   0
  commitment: 0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1
```

**参数说明：**

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--reserve0` | ETH 储备量（单位：ETH） | 10 | `--reserve0 100` |
| `--reserve1` | USDC 储备量（单位：USDC） | 20000 | `--reserve1 50000` |
| `--nonce` | 防重放计数器 | 0 | `--nonce 5` |
| `--fee` | 累计手续费（单位：wei） | 0 | `--fee 3000000000000000` |
| `--check` | 验证模式：检查 commitment | - | `--check 0x123...` |

---

### 3. `check-pool-state.sh` - 检查池子状态

**用途：** 查询链上当前的池子承诺和本地缓存状态

**使用方法：**

```bash
./scripts/check-pool-state.sh
```

**输出示例：**

```
🔍 Checking Pool State

RPC URL:       http://127.0.0.1:8545
Vault Address: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

✅ RPC connection OK

📡 Querying on-chain commitment...
Current Commitment:
  0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1

📡 Querying Merkle root...
Merkle Root:
  0x27ae5ba08d7291c96c8cbddcc148bf48a6d68c7974b94356f53754ef6171d757

🔐 Attempting to decode commitment...

✅ Match found!

Pool State (Default Initial):
  reserve0: 10 ETH
  reserve1: 20000 USDC
  nonce:    0
  feeBps:   0
  commitment: 0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1

📊 Summary

On-chain State:
  Commitment: 0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1
  Merkle Root: 0x27ae5ba08d7291c96c8cbddcc148bf48a6d68c7974b94356f53754ef6171d757

Next Steps:
  - If pool state shows in UI: cache is working ✅
  - If 'Unable to decrypt': clear cache and refresh
  - If button disabled: check wallet connection
```

**前提条件：**

- Anvil 必须在运行
- `client/.env.local` 或 `client/.env` 存在并配置了 `VITE_VAULT_CONTRACT_ADDRESS`
- 需要 `curl` 和 `jq` 工具

---

### 4. `prepare-proof-assets.sh` - 准备证明资源

**用途：** 将编译好的 ZK 电路文件复制到前端 public 目录

**使用方法：**

```bash
./scripts/prepare-proof-assets.sh
```

**工作流程：**

1. 检查 `circuits/build/swap_circuit_js/swap_circuit.wasm` 是否存在
   - 不存在 → 自动运行 `npm run build`
2. 检查 `circuits/build/swap_circuit_final.zkey` 是否存在
   - 不存在 → 提示运行电路 setup
3. 复制文件到 `client/public/circuits/`

**输出：**

```
📋 Preparing proof assets for client

🔍 Checking circuit build artifacts...
✅ Found WASM: circuits/build/swap_circuit_js/swap_circuit.wasm (2.0M)
✅ Found zkey: circuits/build/swap_circuit_final.zkey (1.4M)

📁 Creating client/public/circuits directory...

📋 Copying proof assets...
  swap_circuit.wasm → client/public/circuits/
  swap_circuit_final.zkey → client/public/circuits/

✅ Proof assets prepared successfully

📊 Client assets:
  client/public/circuits/swap_circuit.wasm (2.0M)
  client/public/circuits/swap_circuit_final.zkey (1.4M)
```

---

## 🚀 常用工作流

### 场景 1：首次设置开发环境

```bash
# 1. 生成 viewing key（可选，已有默认值）
./scripts/generate-viewing-key.sh
# 选择：1) Local development

# 2. 构建电路
cd circuits
npm run build
cd ..

# 3. 准备前端资源
./scripts/prepare-proof-assets.sh

# 4. 部署合约
make deploy-local

# 5. 检查部署状态
./scripts/check-pool-state.sh
```

### 场景 2：计算自定义初始承诺

```bash
# 假设你想初始化池子为 100 ETH / 200k USDC
node scripts/compute-commitment.js \
  --reserve0 100 \
  --reserve1 200000 \
  --nonce 0 \
  --fee 0

# 输出：0xabc123...
# 然后在部署时使用：
export INITIAL_COMMITMENT="0xabc123..."
make deploy-local
```

### 场景 3：验证链上状态

```bash
# 1. 查询当前链上 commitment
./scripts/check-pool-state.sh

# 2. 如果显示 "No match found"，说明已经有人 swap 过了
#    需要从缓存或状态服务恢复

# 3. 清空浏览器缓存后，在 Console 运行：
localStorage.clear()

# 4. 刷新页面，应该会回到初始状态
```

### 场景 4：团队协作（共享 viewing key）

```bash
# 团队管理员生成密钥
./scripts/generate-viewing-key.sh
# 选择：2) State service

# 输出：state-service/.env 包含：
# VIEWING_KEY=xxxyyyzzz...

# 团队成员配置：
echo "VITE_VIEWING_KEY=xxxyyyzzz..." >> client/.env.local
echo "VITE_STATE_SERVICE_URL=http://localhost:3001" >> client/.env.local
```

### 场景 5：调试 "按钮禁用" 问题

```bash
# 1. 检查链上状态
./scripts/check-pool-state.sh

# 2. 如果输出正常，打开浏览器 DevTools Console：
localStorage.getItem('luminial.pool-state-cache.v1')

# 3. 如果返回 null，说明缓存为空
#    解决方法：清空缓存 + 重新部署
localStorage.clear()

# 4. 重新部署
make deploy-local

# 5. 刷新前端
```

---

## 🔧 依赖要求

| 脚本 | 依赖工具 |
|------|----------|
| `generate-viewing-key.sh` | `bash`, `openssl` (可选) |
| `compute-commitment.js` | `node` (v18+), `npm` (已安装 `@iden3/js-crypto`) |
| `check-pool-state.sh` | `bash`, `curl`, `jq` |
| `prepare-proof-assets.sh` | `bash` |

**安装缺失工具：**

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq curl

# 检查 Node.js
node --version  # 应该 >= 18

# 安装依赖
cd client
npm install
```

---

## 📚 进阶用法

### 自动化脚本：每日重置环境

```bash
#!/bin/bash
# reset-dev-env.sh

echo "🔄 Resetting development environment..."

# 停止现有服务
pkill -f anvil || true

# 清理构建产物
make clean

# 重新构建
make build

# 启动 Anvil
anvil --host 0.0.0.0 &
sleep 3

# 部署合约
make deploy-local

# 检查状态
./scripts/check-pool-state.sh

echo "✅ Environment reset complete"
```

### CI/CD 集成

```yaml
# .github/workflows/deploy.yml
- name: Generate Production Viewing Key
  run: |
    ./scripts/generate-viewing-key.sh
    # 存储到 GitHub Secrets
    echo "VIEWING_KEY=$VIEWING_KEY" >> $GITHUB_ENV

- name: Compute Initial Commitment
  run: |
    COMMITMENT=$(node scripts/compute-commitment.js --reserve0 1000 --reserve1 2000000 | grep "0x" | tail -1)
    echo "INITIAL_COMMITMENT=$COMMITMENT" >> $GITHUB_ENV
```

---

## ❓ 常见问题

### Q: `generate-viewing-key.sh` 报错 "openssl not found"

**A:** 脚本会自动使用 `/dev/urandom` fallback，生成的密钥同样安全。

### Q: `compute-commitment.js` 报错 "Cannot find module '@iden3/js-crypto'"

**A:** 需要先安装依赖：
```bash
cd client
npm install
```

### Q: `check-pool-state.sh` 显示 "Cannot connect to RPC"

**A:** 确保 Anvil 正在运行：
```bash
# 检查进程
ps aux | grep anvil

# 如果没运行，启动：
make anvil
```

### Q: Viewing Key 泄露了怎么办？

**A:** 重新生成并更新：
```bash
./scripts/generate-viewing-key.sh  # 生成新密钥
# 更新状态服务配置
# 通知团队成员更新 .env.local
```

---

## 🔗 相关文档

- [DEPLOYMENT.md](../DEPLOYMENT.md) - 完整部署指南
- [VIEWING_KEY_GUIDE.md](../VIEWING_KEY_GUIDE.md) - Viewing Key 详细说明
- [Makefile](../Makefile) - 自动化命令参考

---

**提示：** 所有脚本都支持 `--help` 参数查看详细用法（TODO）
