# VRF BLS12-381

基于 BLS12-381 椭圆曲线的可验证随机函数（VRF）实现。

## 特性

- ✅ 基于 BLS12-381 曲线的 VRF 实现
- ✅ 使用 @noble/curves 进行椭圆曲线操作
- ✅ 使用 ethers v6 的 keccak256 进行哈希
- ✅ 支持浏览器和 Node.js 环境
- ✅ 完整的测试覆盖
- ✅ TypeScript 支持

## 安装

```bash
npm install vrf-bls12381
```

或使用开发依赖（如果要运行测试）：

```bash
npm install
```

## 使用方法

### 基本使用

```typescript
import { generateKeyPair, prove, verify } from 'vrf-bls12381';

// 1. 生成密钥对
const { sk, pk } = generateKeyPair();

// 2. Prover 生成 VRF 证明
const input = 'some random input';
const proof = prove(sk, pk, input);

// 3. Verifier 验证证明并获取随机输出
const output = verify(pk, input, proof);

if (output !== null) {
  console.log('验证成功！VRF 输出:', output);
} else {
  console.log('验证失败');
}
```

### API 文档

#### `generateKeyPair()`

生成一个新的密钥对。

**返回值:**
```typescript
{
  sk: bigint;  // 私钥
  pk: ProjectivePoint;  // 公钥（BLS12-381 G1 上的点）
}
```

#### `prove(sk, pk, input, r_1?)`

Prover 生成 VRF 证明。

**参数:**
- `sk: bigint` - 私钥
- `pk: ProjectivePoint` - 公钥
- `input: string | Uint8Array` - 输入数据
- `r_1?: bigint` - 可选的随机数（仅用于测试，生产环境会自动生成）

**返回值:**
```typescript
{
  c: bigint;           // 挑战值
  s_1: bigint;         // 响应值
  preout: Uint8Array;  // 中间输出
}
```

#### `verify(pk, input, proof)`

Verifier 验证 VRF 证明并输出随机值。

**参数:**
- `pk: ProjectivePoint` - 公钥
- `input: string | Uint8Array` - 输入数据
- `proof: VRFProof` - VRF 证明

**返回值:**
- `Uint8Array | null` - 验证成功返回 32 字节的随机输出，失败返回 `null`

#### `H_p(...inputs)`

哈希函数，将输入哈希后 mod BLS12-381 曲线的阶 p。

**参数:**
- `inputs: (string | Uint8Array | bigint)[]` - 可变数量的输入

**返回值:**
- `bigint` - 哈希结果 mod p

#### `H_G(input)`

Hash to Curve 函数，将输入映射到 BLS12-381 G1 曲线上的点。

**参数:**
- `input: string | Uint8Array` - 输入数据

**返回值:**
- `ProjectivePoint` - BLS12-381 G1 曲线上的点

## 开发

### 安装依赖

```bash
npm install
```

### 运行测试

```bash
# 运行测试（watch 模式）
npm test

# 运行测试（单次）
npm run test:run

# 运行测试 UI
npm run test:ui
```

### 构建

```bash
npm run build
```

构建后的文件将输出到 `dist/` 目录：
- `dist/index.js` - ES 模块
- `dist/index.cjs` - CommonJS 模块
- `dist/index.d.ts` - TypeScript 类型定义

## 协议说明

本实现基于以下 VRF 协议：

### Prover 计算

**输入:** `sk`（私钥）, `pk`（公钥）, `in`（输入）

**步骤:**
1. 计算 `preout = sk · H_G(in)`，其中 `H_G` 是 hash to curve 操作
2. 在 `𝔽_p` 中选取随机数 `r_1`
3. 计算 `R = r_1 · G` 和 `R_m = r_1 · H_G(in)`
4. 计算 `c = H_p(in, pk, preout, R, R_m)`，其中 `H_p` 先哈希再 mod p
5. 计算 `s_1 = r_1 + c · sk`

**输出:** `c`, `s_1`, `preout`

### Verifier 验证计算

**输入:** `pk`（公钥）, `in`（输入）, `c`, `s_1`, `preout`

**步骤:**
1. 计算 `R = s_1 · G - c · pk` 和 `R_m = s_1 · H_G(in) - c · preout`
2. 判断 `c = H_p(in, pk, preout, R, R_m)`
3. 如果相等，计算 `out = H(preout, in)` 并输出 `out`，否则输出 `false`

## 技术细节

- **椭圆曲线:** BLS12-381
- **哈希函数:** Keccak256 (ethers v6)
- **Hash to Curve:** BLS12-381 G1 标准 hash to curve
- **曲线操作库:** @noble/curves

## License

MIT

## 作者

Jade Xie

