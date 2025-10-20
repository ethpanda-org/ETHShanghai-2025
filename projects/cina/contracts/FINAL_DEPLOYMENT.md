# Sepolia 测试网最终部署地址

## 基础设施合约
- **EmptyContract**: `0x9cca415aa29f39e46318b60ede8155a7041260b8`
- **ProxyAdmin**: `0x7bc6535d75541125fb3b494decfde10db20c16d8`
- **MockTokenConverter**: `0xc3505d17e4274c925e9c736b947fffbdafcdab27`
- **MultiPathConverter**: `0xc6719ba6caf5649be53273a77ba812f86dcdb951`

## 核心代理合约 (用户交互地址)
- **FxUSD (fxUSD)**: `0x085a1b6da46ae375b35dea9920a276ef571e209c`
- **PoolManager**: `0xbb644076500ea106d9029b382c4d49f56225cb82`
- **PegKeeper**: `0x628648849647722144181c9CB5bbE0CCadd50029`
- **FxUSDBasePool (fxBASE)**: `0x420D6b8546F14C394A703F5ac167619760A721A9`

## 辅助合约
- **ReservePool**: `0x3908720b490a2368519318dD15295c22cd494e34`
- **RevenuePool**: `0x54AC8d19ffc522246d9b87ED956de4Fa0590369A`

## 实现合约 (Implementation)
- **FxUSD Implementation**: `0x88ac04E355102C7573A5d7C626C66aE51db7B5E6`
- **FxUSDBasePool Implementation**: `0x0a082132CCc8C8276dEFF95A8d99b2449cA44EA6`
- **PegKeeper Implementation**: `0x50948c692C5040186e2cBe27f2658ad7B8500198`
- **PoolManager Implementation**: `0x3aF765d84358fC4Ac6faDc9f854F4939742ea5Eb`

## 测试网络信息
- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **USDC Address**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Deployer**: `0xE8055E0fAb02Ceb32D30DA3540Cf97BE1FBf244A`

## 部署状态
✅ 所有合约已部署
✅ 核心代理合约已升级到最新实现
✅ FxUSD 和 FxUSDBasePool 已初始化
⚠️  PegKeeper 和 PoolManager 初始化可能需要调整参数

## 下一步
1. 验证合约到 Etherscan
2. 测试开仓交易
3. 配置流动性池参数
