# Privacy AMM Circuits

零知识证明电路实现 - 用于隐私 AMM 的 Groth16 zkSNARK 电路。

## 📋 项目结构

```
circuits/
├── src/                    # 电路源代码
│   └── swap_circuit.circom # 主交换电路
├── scripts/                # 构建和测试脚本
│   ├── build.sh           # 电路构建脚本
│   └── prove.sh           # 证明生成脚本
├── build/                 # 编译输出（自动生成）
├── output/                # 证明和密钥输出（自动生成）
└── package.json           # NPM 配置
```

## 🛠️ 环境要求

### 必需工具

- **Node.js** >= 16.0.0
- **Circom** >= 2.0.0
- **snarkjs** >= 0.7.0 (通过 npm 安装)
- **circomlib** >= 2.0.0 (通过 npm 安装)

### 安装依赖

```bash
# 安装 npm 依赖
npm install

# 检查 Circom 是否已安装
circom --version
# 预期输出: circom compiler 2.x.x
```

## 🚀 快速开始

### 1. 构建电路

编译电路并生成验证器合约：

```bash
npm run build
```

这个命令会：
- ✅ 编译 `swap_circuit.circom` 到 R1CS + WASM
- ✅ 下载 Powers of Tau (ptau12)
- ✅ 生成 zkey (Groth16 trusted setup)
- ✅ 导出验证密钥 (`verification_key.json`)
- ✅ 生成 Solidity 验证器 (`Groth16Verifier.sol`)
- ✅ 复制验证器到 `contracts/src/`

**预期输出：**
```
🔧 Building Privacy AMM Circuit...
📝 Step 1: Compiling circuit...
✅ Circuit compiled successfully!
...
🎉 Build completed successfully!
```

### 2. 生成测试证明

```bash
npm run prove
```

这个命令会：
- ✅ 生成测试输入数据
- ✅ 计算 witness
- ✅ 生成 Groth16 证明
- ✅ 验证证明
- ✅ 导出 Solidity calldata

**预期输出：**
```
🔐 Generating ZK Proof for Privacy AMM...
📝 Step 1: Generating test input...
✅ Test input generated!
...
✅ Proof verified successfully!
```

### 3. 清理构建文件

```bash
npm run clean
```

## 📊 电路说明

### swap_circuit.circom

**功能**：验证隐私交换的合法性（基于恒定乘积公式）

**私有输入 (Private Inputs)**：
```circom
signal input reserveOld0;    // 旧储备量 0 (WETH)
signal input reserveOld1;    // 旧储备量 1 (USDC)
signal input nonceOld;       // 旧 nonce
signal input feeOld;         // 旧手续费
signal input amountIn;       // 输入金额
signal input amountOut;      // 输出金额
```

**公开输入 (Public Inputs)**：
```circom
signal input commitmentOld;  // 旧承诺 = Poseidon(r0, r1, nonce, fee)
signal output commitmentNew; // 新承诺 = Poseidon(r0', r1', nonce+1, fee')
```

**约束条件 (Constraints)**：
1. **承诺验证**：`commitmentOld == Poseidon(reserveOld0, reserveOld1, nonceOld, feeOld)`
2. **承诺生成**：`commitmentNew == Poseidon(reserveNew0, reserveNew1, nonceNew, feeNew)`
3. **恒定乘积**：`(reserveOld0 + amountIn) * (reserveOld1 - amountOut) >= reserveOld0 * reserveOld1`
4. **储备更新**：`reserveNew0 = reserveOld0 + amountIn`, `reserveNew1 = reserveOld1 - amountOut`
5. **Nonce 递增**：`nonceNew = nonceOld + 1`
6. **手续费累积**：`feeNew >= feeOld + 0.003 * amountIn`

## 📁 生成的文件

### build/ 目录

```
build/
├── swap_circuit.r1cs              # R1CS 约束系统
├── swap_circuit.wasm              # WASM witness 生成器
├── swap_circuit.sym               # 符号文件
├── swap_circuit_0000.zkey         # 初始 zkey
├── swap_circuit_final.zkey        # 最终 zkey (trusted setup)
└── pot12_final.ptau               # Powers of Tau
```

### output/ 目录

```
output/
├── verification_key.json          # 验证密钥
├── Groth16Verifier.sol           # Solidity 验证器
├── input.json                    # 测试输入
├── witness.wtns                  # 计算的 witness
├── proof.json                    # 生成的证明
├── public.json                   # 公开信号
└── calldata.txt                  # Solidity calldata
```

## 🔐 使用证明

### 在智能合约中验证

生成的 `Groth16Verifier.sol` 已自动复制到 `../contracts/src/`。

**合约调用示例**：

```solidity
// 导入验证器
import "./Groth16Verifier.sol";

// 部署验证器
Groth16Verifier verifier = new Groth16Verifier();

// 验证证明
bool isValid = verifier.verifyProof(
    pA,        // [uint256, uint256]
    pB,        // [uint256[2], uint256[2]]
    pC,        // [uint256, uint256]
    pubSignals // [commitmentOld, commitmentNew]
);
```

### 在测试中使用

```bash
cd ../contracts
forge test
```

## 🧪 电路测试

### 手动测试流程

1. **编辑测试输入** (`output/input.json`):
```json
{
  "reserveOld0": "1000000000000000000",
  "reserveOld1": "2000000000000000",
  "nonceOld": "0",
  "feeOld": "0",
  "amountIn": "100000000000000000",
  "amountOut": "190000000000000"
}
```

2. **生成证明**:
```bash
npm run prove
```

3. **查看 calldata**:
```bash
cat output/calldata.txt
```

## 📚 参考资料

- [Circom 文档](https://docs.circom.io/)
- [snarkjs 文档](https://github.com/iden3/snarkjs)
- [Groth16 论文](https://eprint.iacr.org/2016/260.pdf)
- [ZK-SNARKs 介绍](https://z.cash/technology/zksnarks/)

## 🐛 常见问题

### Q: Powers of Tau 下载失败？
**A**: 手动下载并放到 `build/` 目录：
```bash
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
mv powersOfTau28_hez_final_12.ptau circuits/build/pot12_final.ptau
```

### Q: 电路编译错误？
**A**: 检查 Circom 版本并重新安装：
```bash
circom --version  # 应该 >= 2.0.0
```

### Q: 验证器合约部署失败？
**A**: 检查 Solidity 版本兼容性（需要 >= 0.6.11）

## 📝 License

MIT License - EthShanghai 2020 Hackathon
