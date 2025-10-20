# FocusBond EVM 链上功能整合

## 配置说明

### 1. 环境变量配置

复制 `.env.local.example` 到 `.env.local`:
```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 并配置：
```env
# RPC配置
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337

# 合约地址 (Anvil Local)
NEXT_PUBLIC_FOCUS_CONTRACT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_TOKEN_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 2. 启动本地节点

确保 Anvil 本地节点正在运行：
```bash
cd /Users/mingji/postgraduate/FocusBond-ETH
anvil
```

### 3. 启动应用

```bash
cd apps/web
pnpm install
pnpm dev
```

访问：http://localhost:3000

## 整合功能

### 已整合的链上功能：

1. **钱包连接**
   - 使用 wagmi + RainbowKit
   - 支持 MetaMask 等钱包
   - 显示 ETH 和 FCRED 余额

2. **创建会话 (startSession)**
   - 在"专注"页面的"开始专注会话"按钮
   - 链上交易：质押 ETH，记录会话开始时间
   - UI保持不变，仅添加交易逻辑

3. **中断会话 (breakSession)**
   - 在专注进行中的"中断专注"按钮
   - 链上交易：支付 FCRED 惩罚费用，结束会话
   - 实时计算并显示惩罚费用

4. **完成会话 (completeSession)**
   - 倒计时结束后自动显示
   - 链上交易：获得 ETH 奖励，返还质押
   - 实时显示奖励金额

5. **心跳检测 (updateHeartbeat)**
   - 每30秒自动发送（专注模式中）
   - 链上交易：更新最后心跳时间
   - 超时显示警告

## 文件结构

```
apps/web/
├── lib/
│   ├── chain.ts                    # 链配置和合约地址
│   ├── wagmi.ts                    # Wagmi 配置
│   └── hooks/
│       ├── useStartSession.ts      # 创建会话
│       ├── useBreakSession.ts      # 中断会话
│       ├── useCompleteSession.ts   # 完成会话
│       ├── useHeartbeat.ts         # 心跳检测
│       └── useTokenBalance.ts      # 代币余额
├── app/
│   ├── providers.tsx               # Provider配置
│   └── page.tsx                    # 主页面 (UI不变，整合了链上逻辑)
└── .env.local                      # 环境变量
```

## 使用说明

### 连接钱包

1. 访问应用首页
2. 点击"连接 MetaMask 钱包"按钮
3. 在 MetaMask 中确认连接
4. 确保连接到 Anvil Local 网络 (Chain ID: 31337)

### 配置 MetaMask

添加 Anvil Local 网络：
- 网络名称: Anvil Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- 货币符号: ETH

### 开始专注会话

1. 连接钱包后，选择专注时长 (15/25/45/60分钟)
2. 点击"🚀 开始专注会话"
3. 在 MetaMask 中确认交易 (质押 ETH)
4. 等待交易确认
5. 倒计时开始，每30秒自动发送心跳

### 管理会话

**中断会话：**
- 点击"🚫 中断专注"按钮
- 查看惩罚费用 (FCRED)
- 确认后在 MetaMask 中确认交易
- 会话结束，扣除 FCRED

**完成会话：**
- 等待倒计时结束
- 系统自动提示可以完成
- 点击完成按钮
- 获得 ETH 奖励 + 质押返还

## 技术细节

### 交易流程

所有链上交易遵循：`simulate → write → waitForReceipt` 流程

- **simulate**: 模拟交易，检查是否会失败
- **write**: 发送交易到链上
- **waitForReceipt**: 等待交易确认

### Gas 配置

- startSession: 500,000 gas
- breakSession: 300,000 gas
- completeSession: 200,000 gas
- updateHeartbeat: 100,000 gas

### 错误处理

- 所有交易错误会显示在 UI 上
- 网络错误会自动重试
- 余额不足会提前提示

## 测试账户

Anvil 默认测试账户：
```
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## 故障排除

### 钱包连接失败
- 确保 MetaMask 已安装
- 检查是否已添加 Anvil Local 网络
- 尝试切换到 Anvil Local 网络

### 交易失败
- 确保 Anvil 节点正在运行
- 检查合约地址是否正确
- 查看 MetaMask 中的错误信息

### 余额不显示
- 检查环境变量中的代币地址
- 确保合约已部署
- 刷新页面重试

## 验收标准

✅ 连接钱包后，顶部显示地址和 ETH/FCRED 余额
✅ 点击"开始专注"触发链上交易，创建会话
✅ 会话进行中，每30秒自动发送心跳
✅ 点击"中断"触发链上交易，支付 FCRED 惩罚
✅ 点击"完成"触发链上交易，获得 ETH 奖励
✅ 所有UI保持不变，无 hydration 错误
✅ 无 nonce/gasLimit 相关错误

## 注意事项

1. **UI 不变**: 所有链上功能整合到现有按钮事件中，不改变任何 className 或 DOM 结构
2. **SSR 兼容**: 所有钱包相关代码仅在客户端执行
3. **错误提示**: 交易失败会显示详细错误信息
4. **自动刷新**: 余额和会话状态自动更新

## 后续优化

- [ ] 添加交易状态 Toast 提示
- [ ] 实现事件订阅，实时更新状态
- [ ] 添加交易历史记录
- [ ] 支持多链切换

