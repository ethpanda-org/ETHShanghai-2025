# PayWay 第二阶段设置指南

## 🎯 阶段目标

实现PRD Feature 2 - 创建托管合约功能，包括表单、两步交易流程、数据存储和合约详情页。

---

## 📋 前置要求

1. ✅ 完成第一阶段（钱包连接）
2. ✅ 环境变量已配置（.env.local）
3. ✅ Supabase项目已创建
4. 🔴 需要部署智能合约到Sepolia测试网
5. 🔴 需要配置Supabase数据库表

---

## 🔧 环境变量配置

在 `.env.local` 文件中添加以下新配置：

```env
# 已有配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# 新增配置
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x... # PayWay托管合约地址
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS=0x...   # Sepolia USDT地址
```

---

## 📦 智能合约部署

### 方案A：部署PayWay合约（推荐）

1. **准备工作：**
   - 确保有Sepolia测试网ETH（用于部署Gas费）
   - 从Sepolia faucet获取测试ETH

2. **部署合约：**
   ```bash
   # 在contracts目录下
   cd /path/to/contracts
   # 部署到Sepolia
   # 根据你的合约框架（Hardhat/Foundry等）执行部署命令
   ```

3. **记录合约地址：**
   - 部署成功后，将合约地址添加到 `.env.local` 的 `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS`

### 方案B：使用Mock USDT（测试用）

如果没有Sepolia USDT地址，可以部署一个简单的Mock ERC20代币用于测试：

```solidity
// MockUSDT.sol
contract MockUSDT is ERC20 {
  constructor() ERC20("Mock USDT", "USDT") {
    _mint(msg.sender, 1000000 * 10**6); // 1百万 USDT
  }
  
  function decimals() public pure override returns (uint8) {
    return 6;
  }
  
  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }
}
```

部署后将地址添加到 `.env.local` 的 `NEXT_PUBLIC_USDT_CONTRACT_ADDRESS`。

---

## 🗄️ Supabase数据库设置

### 步骤1: 创建数据库表

1. 访问 Supabase Dashboard
2. 进入项目的 SQL Editor
3. 复制并执行 `database/migrations/001_create_contracts_table.sql` 的内容

或者使用命令行（如果安装了Supabase CLI）：

```bash
supabase db push
```

### 步骤2: 配置Row Level Security (RLS)

为了安全，建议启用RLS策略：

```sql
-- 启用RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- 允许所有用户读取（查询合约）
CREATE POLICY "Anyone can view contracts"
ON contracts FOR SELECT
TO public
USING (true);

-- 允许认证用户插入合约
CREATE POLICY "Authenticated users can insert contracts"
ON contracts FOR INSERT
TO public
WITH CHECK (true);

-- 允许付款方更新合约状态
CREATE POLICY "Sender can update contract"
ON contracts FOR UPDATE
TO public
USING (sender_address = auth.uid()::text);
```

**注意：** MVP阶段可以先不启用RLS，方便测试。生产环境必须启用。

---

## 🧪 测试流程

### 1. 获取测试代币

**Sepolia ETH（用于Gas）：**
- https://sepoliafaucet.com
- https://www.alchemy.com/faucets/ethereum-sepolia

**Mock USDT（如果使用方案B）：**
```javascript
// 在控制台调用mint函数
const usdt = new ethers.Contract(USDT_ADDRESS, ABI, signer)
await usdt.mint(yourAddress, ethers.parseUnits('1000', 6))
```

### 2. 测试表单

1. 访问 http://localhost:3000/dashboard/create
2. 填写表单：
   - 收款方地址：输入一个有效的以太坊地址
   - 金额：输入 10 USDT
   - 邮箱：输入真实邮箱
3. 点击"创建并支付"

### 3. 完成两步交易

**步骤1: Approve**
- MetaMask弹出授权请求
- 确认交易
- 等待确认（~15秒）

**步骤2: Create Escrow**
- MetaMask再次弹出交易请求
- 确认交易
- 等待确认（~15秒）

### 4. 验证结果

1. 交易成功后自动跳转到详情页
2. 检查数据库是否有记录：
   ```sql
   SELECT * FROM contracts ORDER BY created_at DESC LIMIT 1;
   ```
3. 在Sepolia Etherscan查看交易记录

---

## 📁 新增文件清单

### 配置文件 (2)
```
src/lib/contracts.ts        # 合约配置和常量
src/lib/usdt-abi.json        # USDT ABI
```

### 数据库操作 (1)
```
src/lib/db.ts                # Supabase CRUD操作
```

### Hooks (1)
```
src/hooks/useCreateEscrow.ts # 创建托管交易Hook
```

### 页面 (2)
```
src/app/dashboard/create/page.tsx                # 创建合约页面
src/app/dashboard/contracts/[orderId]/page.tsx   # 合约详情页
```

### 组件 (5)
```
src/components/contract/CreateContractForm.tsx      # 表单组件
src/components/contract/TokenBalance.tsx            # 余额显示
src/components/contract/TransactionProgress.tsx    # 交易进度
src/components/contract/ContractDetails.tsx        # 合约详情
src/components/contract/AddressDisplay.tsx         # 地址显示
```

### 数据库迁移 (1)
```
database/migrations/001_create_contracts_table.sql
```

---

## ✅ 功能检查清单

### 表单测试
- [ ] 访问 /dashboard/create 显示表单
- [ ] 所有字段验证正常（地址、邮箱、金额）
- [ ] USDT余额正确显示
- [ ] 订单号自动生成
- [ ] 可以重新生成订单号

### 交易测试
- [ ] 点击"创建并支付"唤起钱包
- [ ] Approve交易成功执行
- [ ] 交易进度正确显示
- [ ] Deposit交易成功执行
- [ ] 两步交易都等待确认

### 数据测试
- [ ] 合约信息保存到Supabase
- [ ] 可以查询到合约记录
- [ ] 跳转到详情页
- [ ] 详情页显示正确信息

### 边界情况
- [ ] 余额不足时显示警告
- [ ] 用户拒绝签名的提示
- [ ] 交易失败的错误处理
- [ ] 网络异常的处理

---

## 🐛 常见问题

### 1. 找不到合约地址

**问题：** 环境变量中合约地址为 0x000...

**解决：**
- 确保已部署合约到Sepolia
- 更新 `.env.local` 中的地址
- 重启开发服务器

### 2. USDT余额显示为0

**问题：** TokenBalance组件显示余额为0

**解决：**
- 检查USDT合约地址是否正确
- 确保钱包有测试USDT
- 检查网络是否为Sepolia

### 3. Approve交易失败

**问题：** 授权USDT时交易失败

**原因：**
- Gas费不足
- USDT合约地址错误
- 网络拥堵

**解决：**
- 确保有足够的Sepolia ETH
- 检查合约地址
- 提高Gas限额

### 4. 数据库保存失败

**问题：** Supabase返回错误

**原因：**
- 表未创建
- RLS策略阻止
- 字段类型不匹配

**解决：**
- 执行迁移SQL
- 临时禁用RLS测试
- 检查数据类型

---

## 🚀 下一步

完成第二阶段后，可以继续：

1. **Feature 3：触发资金释放**
   - 后端邮件监控服务
   - 邮件指令解析
   - 链上放款执行

2. **Feature 4：取消托管合约**
   - 取消按钮功能实现
   - 退款逻辑

3. **Feature 5：合约管理面板**
   - 合约列表展示
   - 筛选和排序
   - 统计数据

---

## 📞 需要帮助？

- 检查控制台错误信息
- 查看网络请求状态
- 验证环境变量配置
- 确认Supabase连接
- 查看Etherscan交易详情

---

**开发完成后，别忘了：**
1. 提交代码到Git
2. 更新项目文档
3. 记录测试合约地址
4. 备份数据库迁移文件

