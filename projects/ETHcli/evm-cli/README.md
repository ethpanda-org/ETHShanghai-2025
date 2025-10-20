# evm-cli - EVM AI Assistant CLI

一个美观的终端界面，用于与 EVM/以太坊 AI 代理交互，管理钱包和执行区块链操作。

## ✨ 功能特性

### 钱包管理
- ✅ 安全导入以太坊私钥
- ✅ AES-256-GCM 加密存储
- ✅ PBKDF2 密钥派生（100,000 次迭代）
- ✅ 支持 hex 格式私钥（带或不带 0x）
- ✅ 自动派生以太坊地址

### 交互界面
- ⛓️ 精美的 TUI（终端用户界面）
- 🎨 以太坊主题配色（紫/品红色系）
- 💬 实时流式 AI 响应
- 📜 Markdown 渲染支持
- ⌨️ 命令自动补全

### AI 功能
- 💰 查询钱包资产
- 💸 ETH 转账（带模拟预览）
- 📊 资产价值计算
- 🏆 DeFi 项目推荐
- 📖 文档问答（RAG）

## 📦 安装

### 前置要求
- Rust 1.70+
- Python 3.8+ 及配置好的 agent-py

### 构建步骤

```bash
cd evm-cli
cargo build --release
```

## 🚀 快速开始

### 1. 导入钱包

```bash
./target/release/evm-cli wallet import my_wallet
```

会提示输入：
- 私钥（hex 格式，如 `0x123...` 或 `123...`）
- 加密密码
- 确认密码

### 2. 查看钱包

```bash
./target/release/evm-cli wallet list
```

### 3. 启动 CLI

```bash
./target/release/evm-cli cli
```

步骤：
1. 选择要使用的钱包
2. 输入密码解锁
3. 等待 agent-py 启动（首次需 1-3 分钟）
4. 进入聊天界面

## 💬 使用示例

进入 TUI 后，您可以：

```
# 查询钱包资产
我的钱包有哪些资产？

# 查询总价值
我的资产值多少钱？

# 转账（会先模拟）
帮我转 0.1 ETH 到 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# 查询 DeFi 项目
给我推荐一些热门的 DeFi 项目

# 退出
/quit 或 Ctrl+C
```

## ⌨️ 快捷键

- **Enter** - 发送消息
- **Ctrl+C** - 退出
- **↑/↓** - 滚动聊天历史
- **Tab** - 接受自动补全建议

## 🔧 命令参考

### wallet import

```bash
evm-cli wallet import <ACCOUNT_NAME>
```

导入一个新钱包。

### wallet list

```bash
evm-cli wallet list
```

列出所有已导入的钱包。

### wallet remove

```bash
evm-cli wallet remove <ACCOUNT_NAME>
```

删除指定钱包（需要密码确认）。

### cli

```bash
evm-cli cli
```

启动交互式 AI 聊天界面。

## 📂 数据存储

钱包数据加密存储在：
- macOS: `~/Library/Application Support/evm-cli/wallets.json`
- Linux: `~/.local/share/evm-cli/wallets.json`

## 🔒 安全说明

- ✅ 私钥使用 AES-256-GCM 加密
- ✅ 密码经过 PBKDF2-HMAC-SHA256 派生
- ✅ 私钥仅在内存中短暂存在
- ✅ 自动清理子进程
- ⚠️ 请勿在不安全的环境下使用
- ⚠️ 请妥善保管密码

## 🐛 故障排查

### 问题：无法连接到 agent

**解决方法：**
```bash
# 检查 Python 环境
ls ../agent-py/.venv/bin/python

# 手动测试 agent-py
cd ../agent-py
source .venv/bin/activate
export EVM_PRIVATE_KEY=0x...
python main.py
```

### 问题：私钥格式错误

**解决方法：**
- 确保私钥是 64 位十六进制字符串
- 可以带或不带 `0x` 前缀
- 示例：`0x1234...` 或 `1234...`

## 📄 许可证

MIT License

