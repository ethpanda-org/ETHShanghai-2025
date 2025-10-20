# agent-evm - EVM AI Agent

基于 Google Gemini 和 LangChain 的智能 EVM/以太坊代理，提供自然语言交互的区块链操作能力。

## 🌟 功能特性

### AI 能力
- ✅ Google Gemini 2.5 Flash 模型
- ✅ ReAct 代理框架（推理+行动）
- ✅ 对话历史记忆
- ✅ 流式响应输出
- ✅ RAG 文档问答

### EVM 工具集成
通过 MCP (Model Context Protocol) 集成 evm-mcp 提供的工具：

1. **transfer_eth** - ETH 转账
   - 支持 dry_run 预览
   - 自动 Gas 估算
   - 余额检查

2. **get_assets** - 资产查询
   - ETH 余额
   - ERC20 代币
   - NFT (ERC721/ERC1155)

3. **get_total_value** - 价值计算
   - 实时 USD 价格
   - 多资产汇总

4. **get_top_defi_projects** - DeFi 推荐
   - TVL 排名
   - 跨链项目

5. **open_in_browser** - 快捷浏览
   - Etherscan 链接

### RAG 文档问答
- 自动索引 docs/ 目录的 Markdown 和 PDF
- FAISS 向量数据库
- 智能文档检索

## 📦 安装

### 1. 创建虚拟环境

```bash
cd agent-evm
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 生成 gRPC 代码

```bash
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=. \
  --grpc_python_out=. \
  ./proto/agent.proto
```

### 4. 配置环境变量

```bash
cp .env.example .env
nano .env  # 编辑并填入真实的 API Keys
```

必需配置：
- `GOOGLE_API_KEY` - Google Gemini API Key
- `ALCHEMY_API_KEY` - Alchemy API Key（推荐）
- `RPC_URL` - 以太坊 RPC URL（可选）

## 🚀 运行

### 方式 1: 通过 evm-cli 启动（推荐）

evm-cli 会自动启动 agent-evm 并注入 `EVM_PRIVATE_KEY`：

```bash
cd ../evm-cli
./target/release/evm-cli cli
```

### 方式 2: 手动启动（测试用）

```bash
# 设置私钥（仅用于测试）
export EVM_PRIVATE_KEY=0x...

# 启动 agent
python main.py
```

**注意**: 手动启动需要确保 evm-mcp 已编译：
```bash
cd ../evm-mcp
cargo build --release
```

## 📁 项目结构

```
agent-evm/
├── main.py              # 主程序（EVM 版本）
├── requirements.txt     # Python 依赖
├── .env.example         # 环境变量模板
├── .gitignore          # Git 忽略规则
├── README.md           # 本文档
│
├── proto/              # gRPC 协议定义
│   └── agent.proto
│
├── docs/               # RAG 文档目录
│   ├── ethereum.md     # 以太坊文档（示例）
│   └── defi.pdf        # DeFi 文档（示例）
│
├── agent_pb2.py        # gRPC 生成文件（自动）
├── agent_pb2_grpc.py   # gRPC 生成文件（自动）
│
├── faiss_index/        # RAG 索引缓存（自动生成）
└── .venv/              # Python 虚拟环境
```

## 🔧 配置说明

### 环境变量

| 变量名 | 必需 | 说明 | 默认值 |
|--------|------|------|--------|
| `GOOGLE_API_KEY` | ✅ | Gemini API Key | - |
| `ALCHEMY_API_KEY` | 推荐 | Alchemy API Key | demo |
| `RPC_URL` | 可选 | 以太坊 RPC | Alchemy demo |
| `EVM_PRIVATE_KEY` | ⚠️ | 由 evm-cli 注入 | - |

### MCP 服务器配置

在 `main.py` 第 224 行修改 evm-mcp 路径：

```python
"command": "/Users/xiangyonglin/code/competition/evm-mcp/target/release/evm-mcp",
```

### RAG 文档配置

将文档放入 `docs/` 目录：
- 支持格式: `.md`, `.pdf`
- 首次运行会自动建立索引
- 索引缓存在 `faiss_index/`

## 💬 使用示例

通过 evm-cli TUI 与 agent 交互：

```
# 查询资产
我的钱包有哪些资产？

# 查询价值
我的资产总价值是多少 USD？

# 转账（会先模拟）
帮我转 0.1 ETH 到 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# DeFi 推荐
给我推荐一些 TVL 最高的 DeFi 项目

# 文档问答
什么是 EIP-1559？
```

## 🔒 安全说明

### 私钥安全
- ✅ `EVM_PRIVATE_KEY` 由 evm-cli 运行时注入
- ✅ 读取后立即从环境变量删除
- ✅ 不写入日志文件
- ❌ 永远不要在 .env 中存储私钥

### API Key 安全
- ✅ 使用 .env 文件（已在 .gitignore）
- ✅ 不要提交 .env 到 Git
- ✅ 定期轮换 API Keys

### 网络安全
- 推荐先在测试网测试
- 使用 HTTPS RPC 端点
- 验证交易前使用 dry_run

## 🐛 故障排查

### 问题 1: "GOOGLE_API_KEY not set"

**解决方法:**
```bash
# 检查 .env 文件
cat .env
# 确保包含 GOOGLE_API_KEY=...
```

### 问题 2: "No module named 'agent_pb2'"

**解决方法:**
```bash
# 重新生成 gRPC 代码
python -m grpc_tools.protoc -I./proto --python_out=. --grpc_python_out=. ./proto/agent.proto
```

### 问题 3: "evm-mcp not found"

**解决方法:**
```bash
# 编译 evm-mcp
cd ../evm-mcp
cargo build --release

# 检查路径
ls ../evm-mcp/target/release/evm-mcp

# 更新 main.py 中的路径
```

### 问题 4: RAG 索引构建慢

**说明:**
- 首次运行需要 1-5 分钟
- 下载 sentence-transformers 模型
- 之后会使用缓存

**加速方法:**
```bash
# 预下载模型
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
```

## 📊 性能优化

### RAG 优化
- 使用 FAISS GPU 版本（如果有 GPU）
- 调整 chunk_size 和 chunk_overlap
- 限制文档数量

### 响应优化
- 调整 temperature 参数
- 使用更快的 Gemini 模型
- 启用流式输出

## 🔄 版本历史

### v1.0.0 (当前)
- ✅ 基于 agent-py 改造
- ✅ 支持 EVM/以太坊
- ✅ 集成 evm-mcp 工具
- ✅ RAG 文档问答
- ✅ 完整文档

---

**祝使用愉快！** ⛓️✨

